import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedAvatar } from '@/components/game/AnimatedAvatar';
import { EmojiReactionBar, FloatingReactions } from '@/components/game/EmojiReactions';
import { supabase } from '@/integrations/supabase/client';
import { Zap, Users, Copy, Check, Volume2, VolumeX, Gamepad2, LogOut, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { TeamFormationRoom } from '@/components/game/TeamFormationRoom';

interface Participant {
  id: string;
  name: string;
  avatar_id: number;
  user_id: string;
}

interface Reaction {
  id: string;
  emoji: string;
  participantId: string;
  x: number;
  y: number;
}

// Floating particle component
const FloatingParticle = ({ delay }: { delay: number }) => {
  const randomX = Math.random() * 100;
  const randomDuration = 15 + Math.random() * 10;

  return (
    <motion.div
      initial={{ y: '100vh', x: `${randomX}vw`, opacity: 0 }}
      animate={{
        y: '-10vh',
        opacity: [0, 0.6, 0.6, 0],
      }}
      transition={{
        duration: randomDuration,
        delay: delay,
        repeat: Infinity,
        ease: 'linear',
      }}
      className="absolute w-2 h-2 rounded-full bg-primary/30 blur-sm"
    />
  );
};

// Join/Leave notification toast component
const PlayerNotification = ({ name, avatarId, type }: { name: string; avatarId: number; type: 'join' | 'leave' }) => {
  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      className="flex items-center gap-3 bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl px-4 py-3 shadow-lg"
    >
      <AnimatedAvatar avatarId={avatarId} size="xs" showName={false} />
      <div>
        <p className="font-medium text-sm">{name}</p>
        <p className="text-xs text-muted-foreground">
          {type === 'join' ? 'joined the game' : 'left'}
        </p>
      </div>
    </motion.div>
  );
};

// Bouncing dots loader
const BouncingDots = () => (
  <div className="flex gap-1">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        className="w-2 h-2 rounded-full bg-primary"
      />
    ))}
  </div>
);

export default function WaitingRoom() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [optimisticReaction, setOptimisticReaction] = useState<Reaction | null>(null);
  const [notifications, setNotifications] = useState<{ id: string; name: string; avatarId: number; type: 'join' | 'leave' }[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [roomId, setRoomId] = useState<string | null>(location.state?.roomId || null);
  const [participantDbId, setParticipantDbId] = useState<string | null>(location.state?.participantDbId || null);
  const [gameMode, setGameMode] = useState<'classic' | 'team' | 'coop'>('classic');
  const [modeAnnouncement, setModeAnnouncement] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [roomNotFound, setRoomNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [phase, setPhase] = useState<string>('waiting');

  console.log('Current WaitingRoom phase:', phase);

  // Get current user's participant info from location state or auth
  const currentParticipantId = location.state?.participantId || user?.id;
  const currentParticipantName = location.state?.name || profile?.name || user?.email?.split('@')[0] || 'You';

  // Fetch room and initial participants
  useEffect(() => {
    const fetchRoomAndParticipants = async () => {
      if (!roomCode) return;

      setIsLoading(true);
      try {
        // First get the room ID and game mode
        const { data: room, error: roomError } = await supabase
          .from('game_rooms')
          .select('id, game_mode, status')
          .eq('room_code', roomCode.toUpperCase())
          .maybeSingle();

        if (roomError) throw roomError;
        if (!room) {
          setRoomNotFound(true);
          setIsLoading(false);
          return;
        }

        // If game already started/ended, redirect appropriately
        if (room.status === 'live') {
          navigate(`/play/${roomCode}`, {
            state: {
              roomId: room.id,
              participantDbId,
              name: currentParticipantName,
            }
          });
          return;
        }

        if (room.status === 'ended') {
          toast.error('This game has already ended');
          navigate('/');
          return;
        }

        setRoomId(room.id);
        setGameMode((room.game_mode as 'classic' | 'team' | 'coop') || 'classic');

        // Fetch participants that joined recently (within last 2 hours - active session)
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        const { data: participantsData, error: participantsError } = await supabase
          .from('room_participants')
          .select('id, name, avatar_id, user_id')
          .eq('room_id', room.id)
          .gte('joined_at', twoHoursAgo);

        if (participantsError) throw participantsError;
        setParticipants(participantsData || []);
      } catch (error) {
        console.error('Error fetching room data:', error);
        toast.error('Failed to load room data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomAndParticipants();
  }, [roomCode, navigate, participantDbId, currentParticipantName]);

  // Subscribe to real-time presence
  useEffect(() => {
    if (!roomId) return;

    // We only track presence if we have a valid participant ID
    const shouldTrack = !!participantDbId;

    // Join the presence channel
    const channel = supabase.channel(`room_${roomId}`, {
      config: {
        presence: {
          key: participantDbId || `observer-${Date.now()}`,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const presentParticipants = Object.values(newState)
          .flat()
          .filter((p: any) => p.user_type === 'player') // Only show players, not observers
          .map((p: any) => ({
            id: p.participantId, // Use the DB ID as the primary key
            name: p.name,
            avatar_id: p.avatarId,
            user_id: p.userId,
            score: 0,
            current_streak: 0,
            max_streak: 0,
          }));

        // Remove duplicates based on ID (just in case multiple tabs, though ID should be unique per participant)
        const uniqueParticipants = Array.from(new Map(presentParticipants.map(p => [p.id, p])).values());
        setParticipants(uniqueParticipants);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // Show notification for new joiners
        newPresences.forEach((p: any) => {
          if (p.user_type === 'player' && p.participantId !== participantDbId) {
            const notificationId = `join-${p.participantId}`;
            setNotifications(prev => [...prev.slice(-2), {
              id: notificationId,
              name: p.name,
              avatarId: p.avatarId,
              type: 'join',
            }]);
            setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== notificationId)), 3000);
          }
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && shouldTrack) {
          // Track presence with user metadata
          await channel.track({
            participantId: participantDbId,
            name: location.state?.name || 'Unknown',
            avatarId: location.state?.avatarId || 0,
            userId: user?.id || 'anonymous',
            online_at: new Date().toISOString(),
            user_type: 'player'
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, participantDbId, location.state, user?.id]);

  // Subscribe to game state changes to detect when game starts
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`game_state_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_state',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log('Postgres changes in WaitingRoom:', payload);
          const gameState = payload.new as { phase: string };
          if (gameState?.phase) {
            console.log('Setting phase to:', gameState.phase);
            setPhase(gameState.phase);
          }
          if (gameState?.phase === 'instructions' || gameState?.phase === 'question' || gameState?.phase === 'discussion' || gameState?.phase === 'team_naming') {
            // Game has started, navigate to live quiz
            toast.success('Game is starting!');
            navigate(`/play/${roomCode}`, {
              state: {
                roomId,
                participantDbId,
                name: currentParticipantName,
              }
            });
          }
        }
      )
      .subscribe();

    // Also check current game state in case we missed the event
    const checkGameState = async () => {
      const { data } = await supabase
        .from('game_state')
        .select('phase')
        .eq('room_id', roomId)
        .maybeSingle();

      if (data?.phase) {
        console.log('Initial check: phase is:', data.phase);
        setPhase(data.phase);
      }
      if (data?.phase === 'instructions' || data?.phase === 'question' || data?.phase === 'discussion' || data?.phase === 'results' || data?.phase === 'leaderboard' || data?.phase === 'team_naming') {
        navigate(`/play/${roomCode}`, {
          state: {
            roomId,
            participantDbId,
            name: currentParticipantName,
          }
        });
      }
    };
    checkGameState();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, roomCode, navigate, participantDbId, currentParticipantName]);

  // Subscribe to game room changes (mode changes)
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`game_room_mode_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const updatedRoom = payload.new as { game_mode: string };
          const newMode = updatedRoom.game_mode as 'classic' | 'team' | 'coop';

          if (newMode !== gameMode) {
            setGameMode(newMode);

            // Show announcement
            const modeName = newMode === 'coop' ? 'Co-op Mode 🤝' : newMode === 'team' ? 'Team Mode 👥' : 'Classic Mode 🎯';
            setModeAnnouncement(`Host changed game mode to ${modeName}`);
            toast.info(`Game mode changed to ${modeName}`);

            // Clear announcement after delay
            setTimeout(() => setModeAnnouncement(null), 4000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, gameMode]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode || '');
    setCopied(true);
    toast.success('Room code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveRoom = async () => {
    if (isLeaving) return;

    // If no participantDbId, just navigate home
    if (!participantDbId) {
      navigate('/');
      return;
    }

    setIsLeaving(true);
    try {
      await supabase
        .from('room_participants')
        .delete()
        .eq('id', participantDbId);

      toast.success('You left the room');
      navigate('/');
    } catch (error) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room');
      setIsLeaving(false);
    }
  };

  const handleOptimisticReaction = (emoji: string) => {
    if (!participantDbId) return;

    // Create optimistic reaction
    const reaction: Reaction = {
      id: `opt-${Date.now()}`,
      emoji,
      participantId: participantDbId,
      x: 20 + Math.random() * 60, // Random x between 20-80%
      y: Math.random() * 20, // Random y offset
    };

    setOptimisticReaction(reaction);

    // Reset after a moment so the same emoji can be sent again
    setTimeout(() => setOptimisticReaction(null), 100);
  };

  // Room not found state
  if (roomNotFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-3xl p-8 w-full max-w-md relative z-10 text-center"
        >
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">Room Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The room code "{roomCode}" doesn't exist or has expired.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate('/join')}>
              Try Another Code
            </Button>
            <Button onClick={() => navigate('/')}>
              Go Home
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BouncingDots />
          <p className="mt-4 text-muted-foreground">Loading room...</p>
        </div>
      </div>
    );
  }

  const displayCode = roomCode || '------';

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <FloatingParticle key={i} delay={i * 0.8} />
        ))}
      </div>

      {/* Ambient glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Header */}
      <header className="relative z-20 border-b border-border/30 bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 font-display text-2xl font-bold gradient-text">
            <Zap className="w-7 h-7" />
            Zappy
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
              aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLeaveRoom}
              disabled={isLeaving}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              aria-label="Leave room"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Leave
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 container mx-auto px-4 py-8 flex flex-col items-center">
        {phase === 'team_formation' ? (
          <TeamFormationRoom
            roomId={roomId!}
            isHost={false}
            gameMode={gameMode as 'team' | 'coop'}
            myParticipantId={participantDbId}
          />
        ) : phase === 'team_setup' ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <Users className="w-16 h-16 text-primary mb-4" />
            <h2 className="text-2xl font-display font-bold mb-2">Host is organizing teams...</h2>
            <p className="text-muted-foreground">The game will start once teams are ready</p>
          </div>
        ) : (
          <>
            {/* Room code section */}
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-10"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full mb-4"
              >
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-sm font-medium text-primary">Live Lobby</span>
              </motion.div>

              <h1 className="font-display text-3xl md:text-4xl font-bold mb-6">
                Join at <span className="gradient-text">zappy.app</span>
              </h1>

              {/* Room code card */}
              <motion.button
                onClick={copyRoomCode}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="glass-card px-10 py-6 rounded-2xl cursor-pointer group relative overflow-hidden"
                aria-label={`Copy room code ${displayCode}`}
              >
                {/* Shimmer effect */}
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
                />

                <p className="text-muted-foreground text-sm mb-2">Game PIN</p>
                <div className="flex items-center justify-center gap-3">
                  <p className="font-mono text-4xl sm:text-5xl md:text-6xl font-bold tracking-[0.1em] sm:tracking-[0.3em] gradient-text">
                    {displayCode}
                  </p>
                  <motion.div
                    initial={false}
                    animate={{ scale: copied ? [1, 1.2, 1] : 1 }}
                    className="p-2 rounded-lg bg-muted/50 group-hover:bg-muted transition-colors"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5 text-muted-foreground" />
                    )}
                  </motion.div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to copy
                </p>
              </motion.button>
            </motion.div>

            {/* Game mode & Player count */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 mb-8 flex-wrap justify-center"
            >
              {/* Game Mode Badge */}
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full border border-primary/30">
                <Gamepad2 className="w-5 h-5 text-primary" />
                <span className="font-display font-bold">
                  {gameMode === 'coop' ? 'Co-op Mode' : gameMode === 'team' ? 'Team Mode' : 'Classic Mode'}
                </span>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full">
                <Users className="w-5 h-5 text-primary" />
                <span className="font-display font-bold text-xl">{participants.length}</span>
                <span className="text-muted-foreground">players</span>
              </div>
            </motion.div>

            {/* Mode Change Announcement */}
            <AnimatePresence>
              {modeAnnouncement && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg font-display font-bold text-lg"
                >
                  {modeAnnouncement}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Participants grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full max-w-4xl"
            >
              {participants.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Waiting for players to join...</p>
                  <BouncingDots />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <AnimatePresence mode="popLayout">
                    {participants.map((participant, i) => (
                      <motion.div
                        key={participant.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                        transition={{ delay: i * 0.05 }}
                        className="glass-card rounded-xl p-3 sm:p-4 flex flex-col items-center"
                      >
                        <AnimatedAvatar avatarId={participant.avatar_id} size="sm" showName={false} />
                        <p className="mt-2 text-xs sm:text-sm font-medium truncate max-w-full text-center px-1">
                          {participant.name} {participant.id === participantDbId && <span className="text-primary font-bold">(You)</span>}
                        </p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>

            {/* Emoji reactions */}
            {roomId && participantDbId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-8"
              >
                <EmojiReactionBar
                  roomId={roomId}
                  participantId={participantDbId}
                  onReaction={handleOptimisticReaction}
                />
              </motion.div>
            )}
          </>
        )}
      </main>

      {/* Floating reactions */}
      {roomId && (
        <FloatingReactions
          roomId={roomId}
          optimisticReaction={optimisticReaction}
          participants={participants}
          currentParticipantId={participantDbId} // Pass ID to avoid double rendering
        />
      )}

      {/* Notifications */}
      <div className="fixed top-20 right-4 z-50 space-y-2">
        <AnimatePresence>
          {notifications.map((n) => (
            <PlayerNotification key={n.id} name={n.name} avatarId={n.avatarId} type={n.type} />
          ))}
        </AnimatePresence>
      </div>
    </div >
  );
}
