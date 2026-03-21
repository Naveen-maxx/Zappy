import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { AvatarPicker } from '@/components/game/AnimatedAvatar';
import { ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Room code validation: must be exactly 6 alphanumeric characters
const ROOM_CODE_REGEX = /^[A-Z0-9]{6}$/;

export default function JoinGame() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [roomCode, setRoomCode] = useState('');
  const [roomCodeError, setRoomCodeError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [avatarId, setAvatarId] = useState(0);
  const [step, setStep] = useState<'code' | 'name'>('code');
  const [isJoining, setIsJoining] = useState(false);

  const validateRoomCode = (code: string): boolean => {
    const upperCode = code.toUpperCase();
    if (!upperCode) {
      setRoomCodeError('Please enter a room code');
      return false;
    }
    if (!ROOM_CODE_REGEX.test(upperCode)) {
      setRoomCodeError('Room code must be 6 alphanumeric characters');
      return false;
    }
    setRoomCodeError(null);
    return true;
  };

  const validateName = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) {
      setNameError('Please enter your name');
      return false;
    }
    if (trimmed.length < 2) {
      setNameError('Name must be at least 2 characters');
      return false;
    }
    if (trimmed.length > 20) {
      setNameError('Name must be 20 characters or less');
      return false;
    }
    setNameError(null);
    return true;
  };

  const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setRoomCode(value);
    if (roomCodeError) {
      validateRoomCode(value);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (nameError) {
      validateName(value);
    }
  };

  const handleNextStep = () => {
    if (validateRoomCode(roomCode)) {
      setStep('name');
    }
  };

  const handleJoin = async () => {
    // Validate name before proceeding
    if (!validateName(name)) {
      return;
    }

    setIsJoining(true);

    try {
      // Ensure user is authenticated (anonymous auth for guests)
      console.log('JoinGame - Auth Debug:', { user, userId: user?.id });
      let currentUserId = user?.id;
      if (!currentUserId) {
        console.log('No user ID found, attempting anonymous sign-in...');
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
        console.log('Anonymous sign-in response:', { data: anonData, error: anonError });
        if (anonError) {
          console.error('Anonymous auth error:', anonError);
          console.error('Error details:', JSON.stringify(anonError, null, 2));

          // Fallback: Generate a temporary UUID for this session
          console.warn('Falling back to temporary session ID');
          currentUserId = crypto.randomUUID();
          toast.info('Joining as guest player...');
        } else {
          currentUserId = anonData.user?.id;
          console.log('Anonymous sign-in successful:', currentUserId);
        }
      }

      if (!currentUserId) {
        toast.error('Authentication failed. Please try again.');
        setIsJoining(false);
        return;
      }

      // Find the game room by code
      const { data: room, error: roomError } = await supabase
        .from('game_rooms')
        .select('id, status, is_locked')
        .eq('room_code', roomCode.toUpperCase())
        .maybeSingle();

      if (roomError) throw roomError;

      if (!room) {
        toast.error('Room not found. Please check the code.');
        setIsJoining(false);
        return;
      }

      if (room.status !== 'waiting') {
        toast.error('This game has already started or ended.');
        setIsJoining(false);
        return;
      }

      if (room.is_locked) {
        toast.error('This room has been locked by the host.');
        setIsJoining(false);
        return;
      }

      // Add participant to the room (using authenticated user ID)
      const { data: participantData, error: joinError } = await supabase
        .from('room_participants')
        .insert([{
          room_id: room.id,
          user_id: currentUserId,
          name: name.trim(),
          avatar_id: avatarId,
        }])
        .select('id')
        .single();

      if (joinError) {
        if (joinError.code === '42501') {
          // RLS Error - notify the user to adjust Supabase settings
          toast.error('Security policy error: Guest joins are blocked in Supabase.');
          console.error('RLS Error: Please enable "INSERT" policy for the "room_participants" table for "anon" or "public" roles in your Supabase Dashboard.');
          setIsJoining(false);
          return;
        }
        if (joinError.code === '23505') {
          // Already joined - fetch existing participant
          const { data: existingParticipant } = await supabase
            .from('room_participants')
            .select('id')
            .eq('room_id', room.id)
            .eq('user_id', currentUserId)
            .single();

          const dbId = existingParticipant?.id;
          if (dbId) {
            sessionStorage.setItem(`zappy_participant_${room.id}`, dbId);
          }

          // Navigate to waiting room with existing participant info
          navigate(`/waiting/${roomCode.toUpperCase()}`, {
            state: {
              name: name.trim(),
              avatarId,
              participantId: currentUserId,
              roomId: room.id,
              participantDbId: dbId
            }
          });
          return;
        }
        toast.error(`Failed to join room: ${joinError.message}`);
        setIsJoining(false);
        return;
      }

      const newParticipantDbId = participantData?.id;
      if (newParticipantDbId) {
        sessionStorage.setItem(`zappy_participant_${room.id}`, newParticipantDbId);
      }

      // Navigate to waiting room with participant info
      navigate(`/waiting/${roomCode.toUpperCase()}`, {
        state: {
          name: name.trim(),
          avatarId,
          participantId: currentUserId,
          roomId: room.id,
          participantDbId: participantData?.id
        }
      });
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast.error(error.message || 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  // Pre-fill name from profile
  React.useEffect(() => {
    if (profile?.name) {
      setName(profile.name);
    }
  }, [profile]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-background to-primary/10" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-3xl p-6 md:p-8 w-full max-w-md relative z-10 mx-auto"
      >
        <motion.h1
          className="font-display text-3xl font-bold text-center mb-8 gradient-text"
        >
          Join Quiz
        </motion.h1>

        {step === 'code' ? (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <label htmlFor="room-code" className="block text-sm font-medium mb-2">Room Code</label>
              <Input
                id="room-code"
                value={roomCode}
                onChange={handleRoomCodeChange}
                placeholder="Enter 6-digit code"
                className="text-center text-2xl font-display tracking-widest h-16"
                maxLength={6}
                aria-describedby={roomCodeError ? 'room-code-error' : undefined}
                aria-invalid={!!roomCodeError}
              />
              {roomCodeError && (
                <p id="room-code-error" className="text-sm text-destructive mt-2">{roomCodeError}</p>
              )}
            </div>
            <Button
              className="w-full h-14 text-lg"
              disabled={roomCode.length !== 6}
              onClick={handleNextStep}
            >
              Next <ArrowRight className="ml-2" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium mb-2">Your Nickname</label>
              <Input
                id="nickname"
                value={name}
                onChange={handleNameChange}
                placeholder="Enter your name"
                className="text-center text-xl h-14"
                maxLength={20}
                aria-describedby={nameError ? 'nickname-error' : undefined}
                aria-invalid={!!nameError}
              />
              {nameError && (
                <p id="nickname-error" className="text-sm text-destructive mt-2">{nameError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-center" id="avatar-picker-label">Pick Your Avatar</label>
              <AvatarPicker
                selectedId={avatarId}
                onSelect={setAvatarId}
                aria-labelledby="avatar-picker-label"
              />
            </div>

            <Button
              className="w-full h-14 text-lg neon-glow"
              disabled={!name.trim() || isJoining}
              onClick={handleJoin}
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Game! 🎮'
              )}
            </Button>
          </motion.div>
        )}

        <button
          onClick={() => step === 'name' ? setStep('code') : navigate('/')}
          className="mt-6 text-muted-foreground text-sm hover:text-foreground transition-colors w-full text-center"
        >
          ← {step === 'name' ? 'Back' : 'Back to home'}
        </button>
      </motion.div>
    </div>
  );
}
