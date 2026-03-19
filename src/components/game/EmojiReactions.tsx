import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const AVAILABLE_EMOJIS = ['🔥', '😂', '👏', '🤯'];
const RATE_LIMIT_MS = 2000; // 2 seconds between reactions

interface Reaction {
  id: string;
  emoji: string;
  participantId: string;
  playerName?: string;
  x: number;
  y: number;
}

interface FloatingReactionsProps {
  roomId: string;
  optimisticReaction?: Reaction | null;
}

interface EmojiReactionsProps {
  roomId: string;
  participantId: string;
  disabled?: boolean;
  onReaction?: (emoji: string) => void;
}

export function EmojiReactionBar({ roomId, participantId, disabled = false, onReaction }: EmojiReactionsProps) {
  const [lastReactionTime, setLastReactionTime] = useState(0);
  const [isThrottled, setIsThrottled] = useState(false);

  const sendReaction = async (emoji: string) => {
    const now = Date.now();

    // Rate limiting check
    if (now - lastReactionTime < RATE_LIMIT_MS) {
      setIsThrottled(true);
      setTimeout(() => setIsThrottled(false), 500);
      return;
    }

    setLastReactionTime(now);

    setLastReactionTime(now);

    // Trigger optimistic update
    onReaction?.(emoji);

    try {
      const { error } = await supabase.from('lobby_reactions').insert({
        room_id: roomId,
        participant_id: participantId,
        emoji,
      });

      if (error) {
        console.error('Failed to send reaction:', error);
        toast.error('Could not send reaction. Please try again.');

        // Helpful debug hint for common permission/identity issues
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          console.error('RLS policy violation - participant may not be properly registered');
        }
      }
    } catch (error) {
      console.error('Failed to send reaction:', error);
      toast.error('Could not send reaction. Please try again.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex gap-2 p-2 bg-card/80 backdrop-blur-sm rounded-full border border-border/50',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      {AVAILABLE_EMOJIS.map((emoji) => (
        <motion.button
          key={emoji}
          type="button"
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.8 }}
          onClick={() => sendReaction(emoji)}
          disabled={disabled}
          aria-label={`Send reaction ${emoji}`}
          className={cn(
            'w-10 h-10 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center text-xl transition-colors',
            isThrottled && 'cursor-not-allowed opacity-50'
          )}
        >
          {emoji}
        </motion.button>
      ))}
    </motion.div>
  );
}

// Floating reactions display - shows reactions above avatars
interface FloatingReactionsProps {
  roomId: string;
  optimisticReaction?: Reaction | null;
  participants?: { id: string; name: string }[];
  currentParticipantId?: string | null;
}

export function FloatingReactions({ roomId, optimisticReaction, participants = [], currentParticipantId }: FloatingReactionsProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  // Handle optimistic reaction
  useEffect(() => {
    if (optimisticReaction) {
      // Add player name to optimistic reaction if available
      const reactionWithInfo = {
        ...optimisticReaction,
        playerName: participants.find(p => p.id === optimisticReaction.participantId)?.name
      };

      setReactions((prev) => [...prev, reactionWithInfo]);

      // Remove after animation
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== optimisticReaction.id));
      }, 2000);
    }
  }, [optimisticReaction, participants]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`reactions_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lobby_reactions',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newReaction = payload.new as any;

          // Filter out reactions from self to prevent double rendering (already handled optimistically)
          // We use loose quality to handle potential string/number mismatches, 
          // though UUIDs should match exactly.
          if (currentParticipantId && newReaction.participant_id === currentParticipantId) {
            console.log('Ignoring own reaction:', newReaction.id);
            return;
          }

          const participant = participants.find(p => p.id === newReaction.participant_id);

          // Add reaction with random position
          const reaction: Reaction = {
            id: newReaction.id,
            emoji: newReaction.emoji,
            participantId: newReaction.participant_id,
            playerName: participant?.name,
            x: 20 + Math.random() * 60, // Random x between 20-80%
            y: Math.random() * 20, // Random y offset
          };

          setReactions((prev) => [...prev, reaction]);

          // Remove after animation
          setTimeout(() => {
            setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
          }, 2000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, participants, currentParticipantId]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {reactions.map((reaction) => (
          <motion.div
            key={reaction.id}
            initial={{
              x: `${reaction.x}vw`,
              y: '80vh',
              scale: 0.5,
              opacity: 0
            }}
            animate={{
              y: `${20 + reaction.y}vh`,
              scale: [0.5, 1.5, 1],
              opacity: [0, 1, 0]
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="absolute flex flex-col items-center pointer-events-none"
          >
            {reaction.playerName && (
              <span className="text-xs font-bold bg-black/50 text-white px-2 py-0.5 rounded-full mb-1 whitespace-nowrap shadow-sm backdrop-blur-sm">
                {reaction.playerName}
              </span>
            )}
            <span className="text-3xl filter drop-shadow-md">{reaction.emoji}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
