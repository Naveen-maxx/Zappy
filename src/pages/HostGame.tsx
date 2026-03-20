import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ParticipantGrid } from '@/components/game/ParticipantGrid';
import { FloatingReactions } from '@/components/game/EmojiReactions';
import { EnhancedLeaderboard } from '@/components/game/EnhancedLeaderboard';
import { TeamLeaderboard, type TeamEntry } from '@/components/game/TeamLeaderboard';
import { TeamFinalLeaderboard } from '@/components/game/TeamFinalLeaderboard';
import { HostControls } from '@/components/game/HostControls';
import { TeamSetup } from '@/components/game/TeamSetup';
import { TeamFormationRoom } from '@/components/game/TeamFormationRoom';
import { QuestionDisplay } from '@/components/game/QuestionDisplay';
import { CountdownTimer } from '@/components/game/CountdownTimer';
import { supabase } from '@/integrations/supabase/client';
import type { Participant, Question } from '@/types/game';
import { useGameMusic } from '@/hooks/useGameMusic';
import { useCongratulationsVoice } from '@/hooks/useCongratulationsVoice';
import {
  Zap, Play, SkipForward, Users, Copy, Info,
  Check, BarChart3, StopCircle, Loader2, MessageCircle, Clock, Share2, PenLine
} from 'lucide-react';
import { toast } from 'sonner';
import { ShareModal } from '@/components/sharing/ShareModal';


// Discussion Timer component for Co-op mode host view
function DiscussionCountdown({ endsAt }: { endsAt: string }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  return (
    <span className="text-amber-500 font-mono text-xl font-bold">
      {timeLeft}s
    </span>
  );
}

type HostPhase = 'lobby' | 'team_formation' | 'team_naming' | 'team_setup' | 'instructions' | 'question' | 'discussion' | 'results' | 'leaderboard' | 'finished';

interface QuestionStats {
  totalAnswers: number;
  answerCounts: Record<string, number>; // Flexible for index or line number
}

export default function HostGame() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [phase, setPhase] = useState<HostPhase>('lobby');
  const [roomCode, setRoomCode] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timerKey, setTimerKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionStartedAt, setQuestionStartedAt] = useState<string | null>(null);
  const [questionStats, setQuestionStats] = useState<QuestionStats>({
    totalAnswers: 0,
    answerCounts: {},
  });
  const [isRoomLocked, setIsRoomLocked] = useState(false);
  const [gameMode, setGameMode] = useState<'classic' | 'team' | 'coop'>('classic');
  const [highestStreakHolder, setHighestStreakHolder] = useState<string | null>(null);
  const [teams, setTeams] = useState<Array<{ id: string; name: string; color: string; score: number; members: Array<{ id: string; name: string; score: number; avatarId: number }> }>>([]);
  const [discussionEndsAt, setDiscussionEndsAt] = useState<string | null>(null);
  const [discussionTimerKey, setDiscussionTimerKey] = useState(0);
  const [chatEnabled, setChatEnabled] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [numTeams, setNumTeams] = useState(2);
  const [playersPerTeam, setPlayersPerTeam] = useState(5);

  // Store ids of participants who were present at start of game to filter out stale data
  const sessionParticipantIds = useRef<Set<string>>(new Set());

  const { play: playMusic, fadeOut: fadeOutMusic } = useGameMusic();
  const { playCongratulations } = useCongratulationsVoice();

  // Guard to prevent showResults from running twice
  const isProcessingResults = useRef(false);

  // Generate room code
  const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Initialize room and fetch quiz
  useEffect(() => {
    let isMounted = true;

    const initializeRoom = async () => {
      if (!user || !quizId) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch quiz data
        const { data: quiz, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .maybeSingle();

        if (quizError) throw quizError;

        if (!quiz) {
          toast.error('Quiz not found');
          navigate('/dashboard');
          return;
        }

        // Parse questions from JSON and ensure type safety
        const rawQuestions = (quiz.questions as unknown as any[]) || [];
        const quizQuestions: Question[] = rawQuestions.map((q, idx) => {
          const base = {
            id: q.id || String(idx + 1),
            text: q.text || '',
            timeLimit: q.timeLimit || 20,
            imageUrl: q.imageUrl,
          };

          if (q.type === 'code-debug' || (q.codeSnippet && !q.options)) {
            return {
              ...base,
              type: 'code-debug',
              codeSnippet: q.codeSnippet || '',
              correctLine: q.correctLine || 1,
              correctedCode: q.correctedCode || '',
            } as Question;
          } else {
            return {
              ...base,
              type: 'multiple-choice',
              options: q.options || [],
              correctIndex: q.correctIndex || 0,
            } as Question;
          }
        });

        if (isMounted) setQuestions(quizQuestions);

        // Reuse the most recent room that is still active (prevents host/players desync after refresh)
        const { data: existingRooms, error: existingRoomError } = await supabase
          .from('game_rooms')
          .select('*')
          .eq('quiz_id', quizId)
          .eq('host_id', user.id)
          .in('status', ['waiting', 'live'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (existingRoomError) throw existingRoomError;

        const existingRoom = existingRooms?.[0];

        const resumeIfLive = async (existingRoomId: string) => {
          const { data: gameState } = await supabase
            .from('game_state')
            .select('phase, current_question_index, question_started_at, discussion_ends_at, chat_enabled')
            .eq('room_id', existingRoomId)
            .maybeSingle();

          // Also get game mode from room
          const { data: roomData } = await supabase
            .from('game_rooms')
            .select('game_mode')
            .eq('id', existingRoomId)
            .single();

          if (!isMounted || !gameState) return;

          const idx = gameState.current_question_index ?? 0;
          setCurrentQuestionIndex(idx);
          setTimerKey((k) => k + 1);

          // Restore timing state
          if (gameState.question_started_at) {
            setQuestionStartedAt(gameState.question_started_at);
          }
          if (gameState.discussion_ends_at) {
            setDiscussionEndsAt(gameState.discussion_ends_at);
          }
          if (roomData?.game_mode) {
            setGameMode(roomData.game_mode as 'classic' | 'team' | 'coop');
          }
          setChatEnabled(gameState.chat_enabled || false);

          const gsPhase = (gameState.phase || 'waiting') as string;
          if (gsPhase === 'instructions') setPhase('instructions');
          else if (gsPhase === 'discussion') setPhase('discussion');
          else if (gsPhase === 'question') setPhase('question');
          else if (gsPhase === 'results') setPhase('results');
          else if (gsPhase === 'leaderboard') setPhase('leaderboard');
          else if (gsPhase === 'finished') setPhase('finished');
          else if (gsPhase === 'team_formation') setPhase('team_formation');
          else if (gsPhase === 'team_naming') setPhase('team_naming');
          else setPhase('lobby');
        };

        if (existingRoom) {
          if (isMounted) {
            setRoomCode(existingRoom.room_code);
            setRoomId(existingRoom.id);
          }

          if (existingRoom.status === 'live') {
            await resumeIfLive(existingRoom.id);
          }
        } else {
          // Create a new game room
          const code = generateRoomCode();
          const { data: room, error: roomError } = await supabase
            .from('game_rooms')
            .insert([{
              room_code: code,
              quiz_id: quizId,
              host_id: user.id,
              status: 'waiting',
            }])
            .select()
            .single();

          if (roomError) throw roomError;

          if (isMounted) {
            setRoomCode(code);
            setRoomId(room.id);
          }

          // Ensure initial game state exists
          await supabase
            .from('game_state')
            .upsert({
              room_id: room.id,
              phase: 'waiting',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'room_id' });
        }
      } catch (error: any) {
        console.error('Error initializing room:', error);
        toast.error(error.message || 'Failed to create room');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeRoom();

    return () => {
      isMounted = false;
    };
  }, [user, quizId, navigate]);

  // Subscribe to real-time participant changes (Presence for Lobby, DB for Game)
  useEffect(() => {
    if (!roomId) return;

    let cleanup = () => { };

    if (phase === 'lobby') {
      // LOBBY PHASE: Use Presence to show online users only
      const channel = supabase.channel(`room_${roomId}`, {
        config: { presence: { key: 'host' } }
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          const newState = channel.presenceState();

          // Map presence state to Participant objects
          // Filter to ensure we only get 'player' type users (skipping observers/host if any)
          const presentParticipants = Object.values(newState)
            .flat()
            .filter((p: any) => p.user_type === 'player')
            .map((p: any) => ({
              id: p.participantId,
              name: p.name,
              avatarId: p.avatarId,
              score: 0,
              currentStreak: 0,
              maxStreak: 0
            }));

          // Deduplicate
          const uniqueParticipants = Array.from(new Map(presentParticipants.map(p => [p.id, p])).values());
          setParticipants(uniqueParticipants);
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          newPresences.forEach((p: any) => {
            if (p.user_type === 'player') {
              toast.success(`${p.name} joined!`);
            }
          });
        })
        .subscribe();

      cleanup = () => supabase.removeChannel(channel);

    } else {
      // GAME PHASE: Use DB to ensure persistence and scores
      const fetchParticipants = async () => {
        const { data, error } = await supabase
          .from('room_participants')
          .select('id, name, avatar_id, user_id, score, current_streak, max_streak')
          .eq('room_id', roomId);

        if (!error && data) {
          const sessionIds = sessionParticipantIds.current;

          // Filter if we have a session snapshot
          const filteredData = sessionIds.size > 0
            ? data.filter(p => sessionIds.has(p.id))
            : data;

          setParticipants(filteredData.map(p => ({
            id: p.id,
            name: p.name,
            avatarId: p.avatar_id,
            score: p.score,
            currentStreak: p.current_streak,
            maxStreak: p.max_streak,
          })));
        }
      };

      fetchParticipants();

      const channel = supabase
        .channel(`host_room_${roomId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'room_participants',
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const p = payload.new as any;

              // If we have a session snapshot, only allow if they are in it
              // OR if it's a legitimate late-join (which adds them to the set)
              // For now, let's allow all inserts to support late joining, but add them to the set
              sessionParticipantIds.current.add(p.id);

              setParticipants(prev => {
                if (prev.some(existing => existing.id === p.id)) return prev;
                return [...prev, {
                  id: p.id,
                  name: p.name,
                  avatarId: p.avatar_id,
                  score: p.score || 0,
                }];
              });
            } else if (payload.eventType === 'UPDATE') {
              const p = payload.new as any;
              setParticipants(prev => prev.map(existing =>
                existing.id === p.id
                  ? { ...existing, score: p.score, currentStreak: p.current_streak, maxStreak: p.max_streak }
                  : existing
              ));
            } else if (payload.eventType === 'DELETE') {
              const p = payload.old as any;
              setParticipants(prev => prev.filter(existing => existing.id !== p.id));
            }
          }
        )
        .subscribe();

      cleanup = () => supabase.removeChannel(channel);
    }

    return () => cleanup();
  }, [roomId, phase]);

  // Subscribe to real-time answer submissions
  useEffect(() => {
    if (!roomId || phase !== 'question') return;

    let isMounted = true;

    // Reset stats for new question
    setQuestionStats({ totalAnswers: 0, answerCounts: {} });

    // Fetch current counts so the host UI is correct even if realtime events were missed
    const fetchInitialStats = async () => {
      const { data, error } = await supabase
        .from('participant_answers')
        .select('answer_index')
        .eq('room_id', roomId)
        .eq('question_index', currentQuestionIndex);

      if (!isMounted || error || !data) return;

      const counts: Record<string, number> = {};
      for (const row of data) {
        const idx = row.answer_index;
        counts[idx] = (counts[idx] || 0) + 1;
      }

      setQuestionStats({ totalAnswers: data.length, answerCounts: counts });
    };

    fetchInitialStats();

    const channel = supabase
      .channel(`answers_${roomId}_${currentQuestionIndex}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'participant_answers',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const answer = payload.new as any;
          if (answer.question_index === currentQuestionIndex) {
            setQuestionStats((prev) => {
              const newCounts = { ...prev.answerCounts };
              const idx = answer.answer_index;
              newCounts[idx] = (newCounts[idx] || 0) + 1;

              return {
                totalAnswers: prev.totalAnswers + 1,
                answerCounts: newCounts,
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [roomId, phase, currentQuestionIndex]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    toast.success('Room code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const startGame = async () => {
    if (!roomId || questions.length === 0) return;

    // For Team/Co-op modes, go to team setup first if teams not created
    if (gameMode === 'team' && teams.length === 0) {
      setPhase('team_formation');
      return;
    }

    if (gameMode === 'coop' && teams.length === 0) {
      setPhase('team_setup');
      // Update game state phase so participants know
      await supabase
        .from('game_state')
        .upsert({
          room_id: roomId,
          phase: 'team_setup',
          updated_at: new Date().toISOString()
        }, { onConflict: 'room_id' });
      return;
    }

    await startInstructionPhase();
  };

  const startTeamFormation = async (numTeams: number, playersPerTeam: number) => {
    if (!roomId) return;

    setIsLoading(true);
    try {
      // Create empty teams
      const teamColors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
      const teamsToCreate = [];

      for (let i = 0; i < numTeams; i++) {
        teamsToCreate.push({
          room_id: roomId,
          name: `Team ${i + 1}`,
          color: teamColors[i % teamColors.length],
          max_members: playersPerTeam,
        });
      }

      const { data: createdTeams, error: teamError } = await supabase
        .from('teams')
        .insert(teamsToCreate)
        .select();

      if (teamError) {
        console.error('Supabase error inserting teams:', teamError);
        throw teamError;
      }

      if (!createdTeams || createdTeams.length === 0) {
        throw new Error('No teams were created');
      }

      // Update game state to team_formation phase
      const { error: phaseError } = await supabase
        .from('game_state')
        .upsert({
          room_id: roomId,
          phase: 'team_formation',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'room_id' });

      if (phaseError) {
        console.error('Error updating phase:', phaseError);
        throw new Error(`Failed to update game phase: ${phaseError.message}`);
      }

      setPhase('team_formation');
      setTeams(createdTeams.map(t => ({ ...t, members: [], score: 0 })));
    } catch (error: any) {
      console.error('Direct error starting team formation:', error);
      toast.error(`Failed to initialize teams: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const startTeamNamingPhase = async () => {
    if (!roomId) return;

    const duration = 15; // 15 seconds for team naming

    // Update room status
    await supabase
      .from('game_rooms')
      .update({ status: 'live' })
      .eq('id', roomId);

    // Snapshot participants
    sessionParticipantIds.current = new Set(participants.map(p => p.id));

    // Use server-side timestamp
    const { data: serverTime } = await supabase.rpc('update_game_state_with_server_time', {
      p_room_id: roomId,
      p_phase: 'team_naming',
      p_current_question_index: 0,
      p_current_question: null,
      p_correct_answer: null,
      p_chat_enabled: false,
      p_discussion_duration_seconds: duration,
    });

    const startTime = serverTime || new Date().toISOString();
    const endTime = new Date(new Date(startTime).getTime() + duration * 1000).toISOString();

    setPhase('team_naming');
    setDiscussionEndsAt(endTime);
    // Start music
    playMusic();
  };

  const startInstructionPhase = async () => {
    if (!roomId) return;

    const duration = 15; // 15 seconds for instructions

    // Update room status
    await supabase
      .from('game_rooms')
      .update({ status: 'live' })
      .eq('id', roomId);

    // Snapshot participants for the game session
    sessionParticipantIds.current = new Set(participants.map(p => p.id));

    // Use server-side timestamp via RPC function for consistent timing
    const { data: serverTime } = await supabase.rpc('update_game_state_with_server_time', {
      p_room_id: roomId,
      p_phase: 'instructions',
      p_current_question_index: 0,
      p_current_question: null,
      p_correct_answer: null,
      p_chat_enabled: false,
      p_discussion_duration_seconds: duration,
    });

    const startTime = serverTime || new Date().toISOString();
    const endTime = new Date(new Date(startTime).getTime() + duration * 1000).toISOString();

    setPhase('instructions');
    setDiscussionEndsAt(endTime);
    // Start music early during instructions
    playMusic();
  };

  const startFirstQuestion = async () => {
    if (!roomId || questions.length === 0) return;

    // Snapshot the currently active participants to filter out stale data during the game
    sessionParticipantIds.current = new Set(participants.map(p => p.id));

    // Start background music
    playMusic();

    const currentQ = questions[0];

    // Update room status
    await supabase
      .from('game_rooms')
      .update({ status: 'live' })
      .eq('id', roomId);

    // For Co-op mode, start with discussion phase
    const initialPhase = gameMode === 'coop' ? 'discussion' : 'question';
    const discussionDuration = gameMode === 'coop' ? 30 : null; // 30 seconds for discussion

    // Use server-side timestamp via RPC function for consistent timing across all clients
    const { data: serverTime } = await supabase.rpc('update_game_state_with_server_time', {
      p_room_id: roomId,
      p_phase: initialPhase,
      p_current_question_index: 0,
      p_current_question: JSON.parse(JSON.stringify({ ...currentQ, totalQuestions: questions.length })),
      p_correct_answer: null,
      p_chat_enabled: gameMode === 'coop',
      p_discussion_duration_seconds: discussionDuration,
    });

    const questionStartTime = serverTime || new Date().toISOString();
    const discussionEnd = discussionDuration
      ? new Date(new Date(questionStartTime).getTime() + discussionDuration * 1000).toISOString()
      : null;

    isProcessingResults.current = false;
    // Host sees discussion phase for Co-op, question phase for others
    setPhase(initialPhase === 'discussion' ? 'discussion' : 'question');
    setCurrentQuestionIndex(0);
    setQuestionStartedAt(questionStartTime);
    setDiscussionEndsAt(discussionEnd);
    setChatEnabled(gameMode === 'coop');
    if (gameMode === 'coop') {
      setDiscussionTimerKey(prev => prev + 1);
    }
    setTimerKey(prev => prev + 1);
    setQuestionStats({ totalAnswers: 0, answerCounts: {} });
  };

  // Auto-transition from team_naming to instructions
  useEffect(() => {
    if (phase !== 'team_naming' || !discussionEndsAt) return;

    const checkTime = () => {
      if (new Date() >= new Date(discussionEndsAt)) {
        startInstructionPhase();
      }
    };

    const interval = setInterval(checkTime, 100);
    return () => clearInterval(interval);
  }, [phase, discussionEndsAt]);

  // Auto-transition from instructions to first question
  useEffect(() => {
    if (phase !== 'instructions' || !discussionEndsAt) return;

    const checkTime = () => {
      if (new Date() >= new Date(discussionEndsAt)) {
        startFirstQuestion();
      }
    };

    const interval = setInterval(checkTime, 100);
    return () => clearInterval(interval);
  }, [phase, discussionEndsAt]);

  // Auto-transition from discussion to question phase when discussion timer ends
  useEffect(() => {
    if (phase !== 'discussion' || !discussionEndsAt) return;

    const checkTime = () => {
      const now = new Date();
      const end = new Date(discussionEndsAt);

      if (now >= end) {
        // Time to switch to question phase
        setPhase('question');
        setCurrentQuestionIndex(prev => prev); // Force re-render/update

        // Update DB state
        supabase
          .rpc('update_game_state_with_server_time', {
            p_room_id: roomId,
            p_phase: 'question',
            p_current_question_index: currentQuestionIndex,
            p_current_question: JSON.parse(JSON.stringify({ ...questions[currentQuestionIndex], totalQuestions: questions.length })),
            p_correct_answer: null,
            p_chat_enabled: false, // EXPLICITLY DISABLE CHAT
            p_discussion_duration_seconds: null,
          })
          .then(() => {
            // Reset timer for question phase
            setTimerKey(prev => prev + 1);
            setQuestionStartedAt(new Date().toISOString());
          });
      }
    };

    const interval = setInterval(checkTime, 100);
    return () => clearInterval(interval);
  }, [phase, discussionEndsAt, roomId, currentQuestionIndex, questions]);

  // Function to transition from discussion to question phase
  const transitionToQuestionPhase = async () => {
    if (!roomId) return;

    const currentQ = questions[currentQuestionIndex];

    // Transition from discussion to question phase using server-side timestamp
    const { data: serverTime } = await supabase.rpc('update_game_state_with_server_time', {
      p_room_id: roomId,
      p_phase: 'question',
      p_current_question_index: currentQuestionIndex,
      p_current_question: JSON.parse(JSON.stringify({ ...currentQ, totalQuestions: questions.length })),
      p_correct_answer: null,
      p_chat_enabled: false,
      p_discussion_duration_seconds: null,
    });

    const questionStartTime = serverTime || new Date().toISOString();

    // Update host state
    setPhase('question');
    setQuestionStartedAt(questionStartTime);
    setDiscussionEndsAt(null);
    setChatEnabled(false);
    setTimerKey(prev => prev + 1);
  };

  // Helper function to fetch teams with their members
  const fetchTeamsWithMembers = async () => {
    if (!roomId) return;

    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, name, color, score')
      .eq('room_id', roomId)
      .order('score', { ascending: false });

    if (!teamsData) return;

    // Fetch participants with their team assignments
    const { data: participantsData } = await supabase
      .from('room_participants')
      .select('id, name, score, avatar_id, team_id')
      .eq('room_id', roomId)
      .not('team_id', 'is', null);

    const teamsWithMembers = teamsData.map(team => ({
      ...team,
      members: (participantsData || [])
        .filter(p => p.team_id === team.id)
        .map(p => ({
          id: p.id,
          name: p.name,
          score: p.score,
          avatarId: p.avatar_id,
        })),
    }));

    setTeams(teamsWithMembers);
  };

  const onTeamsCreated = async () => {
    // Fetch created teams with members
    await fetchTeamsWithMembers();

    // Start the game
    await startFirstQuestion();
  };

  const showResults = async () => {
    console.log('--- showResults triggered ---', { phase, questionIndex: currentQuestionIndex, roomId });
    // Guard against double execution (timer + button click, or timer firing twice)
    if (!roomId || phase !== 'question' || isProcessingResults.current) {
      console.log('Skipping showResults:', { roomId, phase, isProcessing: isProcessingResults.current });
      return;
    }
    isProcessingResults.current = true;

    try {
      // Offload secure score calculation to the server
      await (supabase.rpc as any)('process_question_results', {
        p_room_id: roomId,
        p_question_index: currentQuestionIndex
      });
      console.log('Results processed successfully via RPC');
    } catch (error) {
      console.error('Error processing results via RPC:', error);
    }
    
    // The realtime listener on game_state will typically transition the phase, 
    // but we cautiously force the local state to ensure Host UI progresses immediately.
    setPhase('results');
  };

  const showLeaderboard = async () => {
    if (!roomId) return;

    await supabase
      .from('game_state')
      .update({
        phase: 'leaderboard',
        updated_at: new Date().toISOString(),
      })
      .eq('room_id', roomId);

    setPhase('leaderboard');
  };

  const nextQuestion = async () => {
    if (!roomId) return;

    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex < questions.length) {
      const nextQ = questions[nextIndex];

      // For Co-op mode, start with discussion phase
      const nextPhase = gameMode === 'coop' ? 'discussion' : 'question';
      const discussionDuration = gameMode === 'coop' ? 30 : null;

      // Use server-side timestamp via RPC function for consistent timing
      const { data: serverTime } = await supabase.rpc('update_game_state_with_server_time', {
        p_room_id: roomId,
        p_phase: nextPhase,
        p_current_question_index: nextIndex,
        p_current_question: JSON.parse(JSON.stringify(nextQ)),
        p_correct_answer: null,
        p_chat_enabled: gameMode === 'coop',
        p_discussion_duration_seconds: discussionDuration,
      });

      const questionStartTime = serverTime || new Date().toISOString();
      const discussionEnd = discussionDuration
        ? new Date(new Date(questionStartTime).getTime() + discussionDuration * 1000).toISOString()
        : null;

      setCurrentQuestionIndex(nextIndex);
      setQuestionStartedAt(questionStartTime);
      setDiscussionEndsAt(discussionEnd);
      setChatEnabled(gameMode === 'coop');
      setTimerKey(prev => prev + 1);
      if (gameMode === 'coop') {
        setDiscussionTimerKey(prev => prev + 1);
      }
      setQuestionStats({ totalAnswers: 0, answerCounts: {} });
      isProcessingResults.current = false;
      // Host sees discussion phase for Co-op
      setPhase(nextPhase === 'discussion' ? 'discussion' : 'question');
    } else {
      // Last question - update game state to finished
      await supabase
        .from('game_state')
        .update({
          phase: 'finished',
          updated_at: new Date().toISOString(),
        })
        .eq('room_id', roomId);

      setPhase('finished');
      // Play congratulations voice
      setTimeout(() => {
        playCongratulations();
      }, 800);
    }
  };

  const endGame = async () => {
    // Fade out music
    fadeOutMusic();

    if (roomId && quizId && user) {
      // Get final sorted participants
      const { data: finalParticipants } = await supabase
        .from('room_participants')
        .select('id, name, avatar_id, score')
        .eq('room_id', roomId)
        .order('score', { ascending: false });

      // Save game results with top 3 winners
      if (finalParticipants && finalParticipants.length > 0) {
        const winner1 = finalParticipants[0];
        const winner2 = finalParticipants[1];
        const winner3 = finalParticipants[2];

        await supabase
          .from('game_results')
          .insert({
            room_id: roomId,
            quiz_id: quizId,
            host_id: user.id,
            total_participants: finalParticipants.length,
            winner_1_name: winner1?.name || null,
            winner_1_score: winner1?.score || null,
            winner_1_avatar_id: winner1?.avatar_id || null,
            winner_2_name: winner2?.name || null,
            winner_2_score: winner2?.score || null,
            winner_2_avatar_id: winner2?.avatar_id || null,
            winner_3_name: winner3?.name || null,
            winner_3_score: winner3?.score || null,
            winner_3_avatar_id: winner3?.avatar_id || null,
          });

        // Update quiz play count
        const { data: quiz } = await supabase
          .from('quizzes')
          .select('play_count')
          .eq('id', quizId)
          .single();

        if (quiz) {
          await supabase
            .from('quizzes')
            .update({ play_count: quiz.play_count + 1 })
            .eq('id', quizId);
        }
      }

      await supabase
        .from('game_rooms')
        .update({ status: 'ended' })
        .eq('id', roomId);

      await supabase
        .from('game_state')
        .update({
          phase: 'finished',
          updated_at: new Date().toISOString(),
        })
        .eq('room_id', roomId);
    }
    navigate(`/results/${roomCode}`);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const answerColors = ['bg-answer-red', 'bg-answer-blue', 'bg-answer-yellow', 'bg-answer-green'];

  // Sort participants by score for leaderboard
  const sortedParticipants = [...participants].sort((a, b) => b.score - a.score);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Creating game room...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">No questions found</p>
          <p className="text-muted-foreground mb-4">This quiz doesn't have any questions yet.</p>
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 font-display text-xl font-bold gradient-text">
            <Zap className="w-6 h-6" />
            Zappy Host
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={copyRoomCode}
              className="flex items-center gap-2 bg-muted hover:bg-muted/80 px-4 py-2 rounded-lg transition-colors"
            >
              <span className="font-mono font-bold text-lg">{roomCode}</span>
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* Lobby Phase */}
          {phase === 'lobby' && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="mb-8">
                <h1 className="font-display text-3xl font-bold mb-2">Waiting for Players</h1>
                <p className="text-muted-foreground flex items-center justify-center gap-2">
                  <Users className="w-5 h-5" />
                  {participants.length} players joined
                </p>
              </div>

              {/* Large Room Code Display */}
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="glass-card rounded-2xl p-8 mb-8 max-w-md mx-auto"
              >
                <p className="text-muted-foreground mb-2">Join at zappy.app</p>
                <p className="font-mono text-5xl font-bold tracking-widest gradient-text">
                  {roomCode}
                </p>
              </motion.div>

              {/* Host Controls */}
              {roomId && (
                <div className="mb-8 max-w-md mx-auto">
                  <HostControls
                    roomId={roomId}
                    participants={participants.map(p => ({
                      id: p.id,
                      name: p.name,
                      avatarId: p.avatarId,
                    }))}
                    isLocked={isRoomLocked}
                    gameMode={gameMode}
                    onLockChange={setIsRoomLocked}
                    onGameModeChange={setGameMode}
                    onKickPlayer={(id) => {
                      setParticipants(prev => prev.filter(p => p.id !== id));
                    }}
                  />

                  {gameMode === 'team' && (
                    <div className="mt-6 glass-card p-6 rounded-xl space-y-4 text-left">
                      <h3 className="font-display font-bold text-lg flex items-center gap-2 text-primary">
                        <Users className="w-5 h-5" />
                        Team Formation Settings
                      </h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <label className="text-muted-foreground">Number of Teams</label>
                            <span className="font-bold text-primary">{numTeams} Teams</span>
                          </div>
                          <input
                            type="range"
                            min="2"
                            max="8"
                            value={numTeams}
                            onChange={(e) => setNumTeams(parseInt(e.target.value))}
                            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <label className="text-muted-foreground">Max Players per Team</label>
                            <span className="font-bold text-primary">{playersPerTeam} Players</span>
                          </div>
                          <input
                            type="range"
                            min="2"
                            max="10"
                            value={playersPerTeam}
                            onChange={(e) => setPlayersPerTeam(parseInt(e.target.value))}
                            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Participants */}
              <div className="mb-8">
                <ParticipantGrid participants={participants} />
              </div>

              <Button
                size="lg"
                className="neon-glow text-lg px-12 h-14"
                onClick={() => {
                  if (gameMode === 'team') {
                    startTeamFormation(numTeams, playersPerTeam);
                  } else {
                    startGame();
                  }
                }}
                disabled={participants.length === 0}
              >
                <Play className="w-5 h-5 mr-2" />
                {gameMode === 'team' ? 'Open Team Formation' : 'Start Game'}
              </Button>
            </motion.div>
          )}

          {/* Team Formation Phase */}
          {phase === 'team_formation' && roomId && (
            <motion.div
              key="team_formation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <TeamFormationRoom
                roomId={roomId}
                isHost={true}
                gameMode={gameMode as 'team' | 'coop'}
                onStartGame={startTeamNamingPhase}
              />
            </motion.div>
          )}

          {/* Team Setup Phase (Legacy/Manual) */}
          {phase === 'team_setup' && roomId && (
            <motion.div
              key="team_setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <TeamSetup
                roomId={roomId}
                participants={participants.map(p => ({
                  id: p.id,
                  name: p.name,
                  avatarId: p.avatarId,
                }))}
                gameMode={gameMode as 'team' | 'coop'}
                onTeamsCreated={onTeamsCreated}
              />
            </motion.div>
          )}

          {/* Team Naming Phase */}
          {phase === 'team_naming' && discussionEndsAt && (
            <motion.div
              key="team_naming"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center"
            >
              <div className="glass-card rounded-2xl p-12 max-w-2xl mx-auto border-primary/20 bg-primary/5">
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <PenLine className="w-10 h-10 text-primary animate-pulse" />
                </div>
                <h2 className="text-3xl font-display font-bold mb-4">Name Your Teams!</h2>
                <p className="text-xl text-muted-foreground mb-8">
                  Team leaders are now choosing their team names.
                </p>

                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Time Remaining</span>
                  <DiscussionCountdown endsAt={discussionEndsAt} />
                </div>
              </div>
            </motion.div>
          )}

          {/* Instructions Phase */}
          {phase === 'instructions' && discussionEndsAt && (
            <motion.div
              key="instructions"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center"
            >
              <div className="glass-card rounded-2xl p-12 max-w-2xl mx-auto border-primary/20 bg-primary/5">
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Info className="w-10 h-10 text-primary animate-pulse" />
                </div>
                <h2 className="text-3xl font-display font-bold mb-4">Instructions in Progress</h2>
                <p className="text-xl text-muted-foreground mb-8">
                  Players are being briefed on the rules for <strong>{gameMode === 'coop' ? 'Co-op' : gameMode === 'team' ? 'Team' : 'Classic'}</strong> mode.
                </p>

                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Starting soon</span>
                  <DiscussionCountdown endsAt={discussionEndsAt} />
                </div>
              </div>
            </motion.div>
          )}

          {/* Discussion Phase (Co-op Mode) */}
          {phase === 'discussion' && currentQuestion && (
            <motion.div
              key="discussion"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  {/* Discussion Timer */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/20 border border-amber-500/30 rounded-xl">
                    <MessageCircle className="w-6 h-6 text-amber-500" />
                    <div>
                      <span className="text-amber-500 font-semibold text-sm block">Discussion Phase</span>
                      {discussionEndsAt && (
                        <DiscussionCountdown endsAt={discussionEndsAt} />
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Question {currentQuestionIndex + 1} of {questions.length}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Teams are discussing...
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={transitionToQuestionPhase}>
                  <SkipForward className="w-4 h-4 mr-2" />
                  Skip to Answers
                </Button>
              </div>

              <QuestionDisplay
                questionText={currentQuestion.text}
                questionNumber={currentQuestionIndex + 1}
                totalQuestions={questions.length}
                imageUrl={currentQuestion.imageUrl}
              />

              {/* Answer options preview (grayed out during discussion) */}
              {currentQuestion.type === 'multiple-choice' && (
                <div className="grid grid-cols-2 gap-4 mt-8 opacity-50">
                  {currentQuestion.options.map((option, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`${answerColors[i]} rounded-xl p-6 text-white`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-lg">{option}</span>
                        <span className="text-2xl font-bold text-white/50">—</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center mt-6 text-muted-foreground"
              >
                Team leaders will submit answers once discussion ends
              </motion.p>
            </motion.div>
          )}

          {/* Question Phase */}
          {phase === 'question' && currentQuestion && (
            <motion.div
              key="question"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <CountdownTimer
                    key={timerKey}
                    duration={currentQuestion.timeLimit}
                    serverStartTime={questionStartedAt}
                    onComplete={showResults}
                  />
                  <div>
                    <p className="text-sm text-muted-foreground">Question {currentQuestionIndex + 1} of {questions.length}</p>
                    <p className="flex items-center gap-1 text-sm">
                      <BarChart3 className="w-4 h-4" />
                      {questionStats.totalAnswers} / {participants.length} answers
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={showResults}>
                  <SkipForward className="w-4 h-4 mr-2" />
                  End Question
                </Button>
              </div>

              <QuestionDisplay
                questionText={currentQuestion.text}
                questionNumber={currentQuestionIndex + 1}
                totalQuestions={questions.length}
                imageUrl={currentQuestion.imageUrl}
                type={currentQuestion.type}
                codeSnippet={currentQuestion.type === 'code-debug' ? currentQuestion.codeSnippet : undefined}
              />

              {/* Answer options (host view - shows counts) */}
              {currentQuestion.type === 'multiple-choice' ? (
                <div className="grid grid-cols-2 gap-4 mt-8">
                  {currentQuestion.options.map((option, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`${answerColors[i]} rounded-xl p-6 text-white`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-lg">{option}</span>
                        <span className="text-2xl font-bold">{questionStats.answerCounts[i] || 0}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="mt-8">
                  <div className="bg-white/10 rounded-xl p-6 text-white text-center">
                    <p className="text-xl mb-2">Submissions</p>
                    <p className="text-4xl font-bold text-primary">{questionStats.totalAnswers}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Results Phase */}
          {phase === 'results' && currentQuestion && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center"
            >
              <h2 className="font-display text-3xl font-bold mb-6">
                Correct Answer
              </h2>

              {/* Answer distribution / Correct Answer Display */}
              {currentQuestion.type === 'multiple-choice' ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                    className={`${answerColors[currentQuestion.correctIndex]} rounded-2xl p-8 max-w-md mx-auto mb-8`}
                  >
                    <p className="text-white text-2xl font-bold">
                      {currentQuestion.options[currentQuestion.correctIndex]}
                    </p>
                  </motion.div>

                  <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
                    {currentQuestion.options.map((option, i) => {
                      const count = questionStats.answerCounts[i] || 0;
                      const percentage = questionStats.totalAnswers > 0
                        ? Math.round((count / questionStats.totalAnswers) * 100)
                        : 0;
                      const isCorrect = i === currentQuestion.correctIndex;

                      return (
                        <div
                          key={i}
                          className={`${answerColors[i]} rounded-xl p-4 relative overflow-hidden ${isCorrect ? 'ring-4 ring-white' : 'opacity-60'
                            }`}
                        >
                          <div className="relative z-10 text-white">
                            <p className="font-semibold">{option}</p>
                            <p className="text-2xl font-bold">{percentage}%</p>
                            <p className="text-sm opacity-80">{count} answers</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="max-w-2xl mx-auto mb-8 space-y-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                    className="bg-green-600 rounded-2xl p-8"
                  >
                    <p className="text-white/80 text-lg mb-2 uppercase tracking-widest font-bold">Answer</p>
                    <p className="text-white text-3xl font-bold">
                      Line {currentQuestion.correctLine}
                    </p>
                  </motion.div>

                  <div className="bg-black/50 rounded-xl p-6 border border-white/10 text-left">
                    <p className="text-gray-400 text-sm mb-2 font-mono">Correction:</p>
                    <code className="block font-mono text-green-400 text-lg">
                      {currentQuestion.correctedCode}
                    </code>
                  </div>
                </div>
              )}

              <Button size="lg" onClick={showLeaderboard}>
                Show Leaderboard
              </Button>
            </motion.div>
          )}

          {/* Leaderboard Phase */}
          {phase === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <h2 className="font-display text-3xl font-bold mb-6">
                {(gameMode === 'team' || gameMode === 'coop') ? 'Team Rankings' : 'Leaderboard'}
              </h2>

              <div className="max-w-md mx-auto mb-8">
                {(gameMode === 'team' || gameMode === 'coop') && teams.length > 0 ? (
                  <TeamLeaderboard
                    teams={teams.map((t, i) => ({
                      ...t,
                      rank: i + 1,
                    }))}
                    showMembers={false}
                  />
                ) : (
                  <EnhancedLeaderboard
                    entries={sortedParticipants.map((p, i) => ({
                      id: p.id,
                      name: p.name,
                      score: p.score,
                      rank: i + 1,
                      avatarId: p.avatarId,
                      currentStreak: p.currentStreak,
                      maxStreak: p.maxStreak,
                    }))}
                    showStreaks
                    highestStreakHolder={highestStreakHolder || undefined}
                  />
                )}
              </div>

              <div className="flex justify-center gap-4">
                {currentQuestionIndex < questions.length - 1 ? (
                  <Button size="lg" className="neon-glow" onClick={nextQuestion}>
                    <SkipForward className="w-4 h-4 mr-2" />
                    Next Question
                  </Button>
                ) : (
                  <Button size="lg" className="neon-glow" onClick={endGame}>
                    <StopCircle className="w-4 h-4 mr-2" />
                    End Game
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* Finished Phase */}
          {phase === 'finished' && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <h1 className="font-display text-4xl font-bold gradient-text mb-4">
                🎉 Game Complete!
              </h1>
              <p className="text-muted-foreground mb-8">
                Redirecting to final results...
              </p>
              <div className="flex justify-center gap-4">
                <Button size="lg" onClick={endGame}>
                  View Results
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate('/dashboard')}>
                  Back to Dashboard
                </Button>
                <Button size="lg" variant="outline" onClick={() => setShowShareModal(true)}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>

              <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                type="host"
                data={{
                  quizTitle: 'Live Quiz',
                  hostName: user?.email?.split('@')[0] || 'Host',
                  totalPlayers: participants.length,
                  winners: participants
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 3)
                    .map(p => ({
                      name: p.name,
                      avatarId: p.avatarId,
                      score: p.score
                    }))
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating reactions */}
      {roomId && (
        <FloatingReactions
          roomId={roomId}
          participants={participants}
        />
      )}
    </div>
  );
}