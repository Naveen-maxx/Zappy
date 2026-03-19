import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Send, Clock, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Security: Maximum message length to prevent abuse
const MAX_MESSAGE_LENGTH = 500;
interface ChatMessage {
  id: string;
  participantId: string;
  participantName: string;
  message: string;
  timestamp: Date;
}

interface TeamChatProps {
  roomId: string;
  teamId: string;
  participantId: string;
  participantName: string;
  isEnabled: boolean;
  discussionEndsAt: Date | null;
  questionIndex?: number;
}

export function TeamChat({
  roomId,
  teamId,
  participantId,
  participantName,
  isEnabled,
  discussionEndsAt,
  questionIndex = 0,
}: TeamChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [nameByParticipantId, setNameByParticipantId] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  const nameMapRef = useRef<Record<string, string>>({});
  const questionIndexRef = useRef(questionIndex);

  // Update refs when props change
  useEffect(() => {
    questionIndexRef.current = questionIndex;
  }, [questionIndex]);

  useEffect(() => {
    nameMapRef.current = {
      ...nameMapRef.current,
      ...nameByParticipantId,
      [participantId]: participantName,
    };
  }, [nameByParticipantId, participantId, participantName]);

  // Subscribe to team chat messages
  useEffect(() => {
    if (!teamId || !roomId) return;

    const fetchMessages = async () => {
      const { data, error } = await (supabase
        .from('team_chat')
        .select(`
          id,
          message,
          created_at,
          participant_id,
          room_participants!inner(name)
        `) as any)
        .eq('team_id', teamId)
        .eq('question_index', questionIndex)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch team chat:', error);
        return;
      }

      if (data) {
        const mapped: ChatMessage[] = data.map((m: any) => ({
          id: m.id,
          participantId: m.participant_id,
          participantName: m.room_participants?.name || nameMapRef.current[m.participant_id] || 'Teammate',
          message: m.message,
          timestamp: new Date(m.created_at),
        }));

        setMessages(mapped);

        // Update name cache
        const cache: Record<string, string> = {};
        for (const m of data as any[]) {
          if (m.participant_id && m.room_participants?.name) {
            cache[m.participant_id] = m.room_participants.name;
          }
        }
        setNameByParticipantId(prev => ({ ...prev, ...cache }));
      }
    };

    const fetchTeamMembers = async () => {
      const { data } = await supabase
        .from('room_participants')
        .select('id, name')
        .eq('team_id', teamId);

      if (data) {
        const cache: Record<string, string> = {};
        for (const p of data as any[]) cache[p.id] = p.name;
        setNameByParticipantId(prev => ({ ...prev, ...cache }));
      }
    };

    // STABLE SUBSCRIPTION: Only depends on teamId
    const channelName = `team_chat_${teamId}_${roomId}`;
    channelRef.current = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_chat',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          const msg = payload.new as any;

          // Crucial: Filter by question index using REF
          // Note: DB writes might be slightly slower, check looseness if needed
          if (msg.question_index !== questionIndexRef.current) return;

          setMessages((prev) => {
            // Check for existing ID (e.g. from initial fetch)
            if (prev.some(m => m.id === msg.id)) return prev;

            // SMART DE-DUPLICATION:
            // Check if we have a temporary message with the same signature (sender + content + approx time)
            const incomingSig = getMessageSignature({
              participantId: msg.participant_id,
              message: msg.message,
              timestamp: msg.created_at
            });

            const existingTempIndex = prev.findIndex(m =>
              m.id.startsWith('temp-') &&
              getMessageSignature(m) === incomingSig
            );

            if (existingTempIndex !== -1) {
              // Found a match! Upgrade the temp message to the real one
              const newMessages = [...prev];
              newMessages[existingTempIndex] = {
                ...newMessages[existingTempIndex],
                id: msg.id,
                timestamp: new Date(msg.created_at)
              };
              return newMessages;
            }

            // No temp match found, add as new
            const newMessage: ChatMessage = {
              id: msg.id,
              participantId: msg.participant_id,
              participantName: nameMapRef.current[msg.participant_id] || 'Teammate',
              message: msg.message,
              timestamp: new Date(msg.created_at),
            };

            return [...prev, newMessage].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          });
        }
      )
      .on(
        'broadcast',
        { event: 'new_message' },
        (payload) => {
          const msg = payload.payload as any;
          if (msg.question_index !== questionIndexRef.current) return;
          if (msg.participantId === participantId) return; // Should be handled by self:false

          setMessages((prev) => {
            // Check for existing ID
            if (prev.some(m => m.id === msg.id)) return prev;

            // Also check signature to prevent double-add if DB came first
            const incomingSig = getMessageSignature(msg);
            if (prev.some(m => getMessageSignature(m) === incomingSig)) return prev;

            const newMessage: ChatMessage = {
              ...msg,
              timestamp: new Date(msg.timestamp),
            };

            return [...prev, newMessage].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          });
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [teamId, roomId, participantId]);

  // Discussion timer
  useEffect(() => {
    if (!discussionEndsAt) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((discussionEndsAt.getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [discussionEndsAt]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // De-duplication helper: Generate a unique signature for a message
  const getMessageSignature = (msg: { participantId: string; message: string; timestamp: Date | string }) => {
    const time = new Date(msg.timestamp).getTime();
    // Round to nearest second to account for slight clock skews between broadcast and DB
    const weirdTimestamp = Math.floor(time / 1000);
    return `${msg.participantId}:${msg.message}:${weirdTimestamp}`;
  };

  const sendMessage = async () => {
    const text = newMessage.trim();
    if (!text || !isEnabled || isSending) return;

    if (text.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Message too long (max ${MAX_MESSAGE_LENGTH} characters)`);
      return;
    }
    const tempId = `temp-${Date.now()}`;
    const timestamp = new Date();

    // Create the message object
    const optimisticMessage: ChatMessage = {
      id: tempId,
      participantId,
      participantName: 'You',
      message: text,
      timestamp: timestamp,
    };

    // Optimistic add
    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');
    setIsSending(true);

    // BROADCAST FIRST for absolute real-time delivery
    if (channelRef.current) {
      const payload = {
        id: tempId,
        participantId,
        participantName: participantName || nameMapRef.current[participantId] || 'You',
        message: text,
        timestamp: timestamp.toISOString(),
        question_index: questionIndex
      };

      channelRef.current.send({
        type: 'broadcast',
        event: 'new_message',
        payload
      });
    }

    try {
      // DB Insert
      const { data, error } = await supabase
        .from('team_chat')
        .insert({
          room_id: roomId,
          team_id: teamId,
          participant_id: participantId,
          message: text,
          question_index: questionIndex,
        })
        .select('id, created_at')
        .single();

      if (error) throw error;

      // Update the optimistic message with real ID
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, id: data.id, timestamp: new Date(data.created_at) }
            : m
        )
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const charactersRemaining = MAX_MESSAGE_LENGTH - newMessage.length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex flex-col h-full bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden',
        'w-full max-w-full md:w-80',
        !isEnabled && 'opacity-60'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">Team Chat</span>
          {!isEnabled && <Lock className="w-4 h-4 text-muted-foreground" aria-label="Chat is locked" />}
        </div>
        {timeLeft !== null && timeLeft > 0 && (
          <div className="flex items-center gap-1 text-sm text-warning">
            <Clock className="w-4 h-4" aria-hidden="true" />
            <span className="font-mono">{timeLeft}s</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2" role="log" aria-live="polite">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isOwn = msg.participantId === participantId;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'flex flex-col max-w-[80%]',
                  isOwn ? 'ml-auto items-end' : 'items-start'
                )}
              >
                <span className="text-[10px] text-muted-foreground mb-0.5">
                  {isOwn ? 'You' : (nameByParticipantId[msg.participantId] || msg.participantName || 'Teammate')}
                </span>
                <div
                  className={cn(
                    'px-3 py-1.5 rounded-2xl text-sm break-words',
                    isOwn
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted rounded-bl-sm'
                  )}
                >
                  {msg.message}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/50">
        {isEnabled ? (
          <div className="space-y-1">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                disabled={!isEnabled || isSending}
                maxLength={MAX_MESSAGE_LENGTH}
                className="flex-1"
                aria-label="Chat message"
              />
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={!newMessage.trim() || !isEnabled || isSending}
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            {newMessage.length > MAX_MESSAGE_LENGTH * 0.8 && (
              <p className={cn(
                "text-xs text-right",
                charactersRemaining < 50 ? "text-destructive" : "text-muted-foreground"
              )}>
                {charactersRemaining} characters remaining
              </p>
            )}
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-2 font-medium">
            <Lock className="w-4 h-4 inline mr-1" aria-hidden="true" />
            Discussion ended. Chat is locked.
          </div>
        )}
      </div>
    </motion.div>
  );
}
