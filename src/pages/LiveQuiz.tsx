import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { QuestionDisplay } from '@/components/game/QuestionDisplay';
import { CountdownTimer } from '@/components/game/CountdownTimer';
import { AnswerButtons } from '@/components/game/AnswerButtons';
import { EnhancedLeaderboard } from '@/components/game/EnhancedLeaderboard';
import { TeamLeaderboard, CompactTeamLeaderboard, type TeamEntry } from '@/components/game/TeamLeaderboard';
import { TeamFinalLeaderboard } from '@/components/game/TeamFinalLeaderboard';
import { AnimatedAvatar } from '@/components/game/AnimatedAvatar';
import { TeamChat } from '@/components/game/TeamChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { Zap, Trophy, Users, Medal, Award, Home, RotateCcw, Flame, MessageCircle, Crown, Clock, Share2, X, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { useGameMusic } from '@/hooks/useGameMusic';
import { useCongratulationsVoice } from '@/hooks/useCongratulationsVoice';
import { ShareModal } from '@/components/sharing/ShareModal';
import { TitleType } from '@/components/game/PlayerTitles';
import { InstructionsScreen } from '@/components/game/InstructionsScreen';
import { Question } from '@/types/game';

// Discussion timer component for Co-op mode
function DiscussionTimer({ endsAt }: { endsAt: Date }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((endsAt.getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  return (
    <span className="font-mono font-bold ml-2">
      {timeLeft}s
    </span>
  );
}

type GamePhase = 'waiting' | 'team_formation' | 'team_naming' | 'instructions' | 'discussion' | 'question' | 'results' | 'leaderboard' | 'finished';

interface GameState {
  phase: string;
  current_question_index: number;
  current_question: Question | null;
  correct_answer: number | null;
  question_started_at: string | null;
  chat_enabled?: boolean;
  discussion_ends_at?: string | null;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  rank: number;
  avatarId?: number;
  currentStreak?: number;
  maxStreak?: number;
}

export default function LiveQuiz() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [timerKey, setTimerKey] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [roomId, setRoomId] = useState<string | null>(location.state?.roomId || null);
  const [participantDbId, setParticipantDbId] = useState<string | null>(location.state?.participantDbId || null);
  const [questionStartedAt, setQuestionStartedAt] = useState<string | null>(null);
  const [highestStreakHolder, setHighestStreakHolder] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<'classic' | 'team' | 'coop'>('classic');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [isTeamLeader, setIsTeamLeader] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(false);
  const [discussionEndsAt, setDiscussionEndsAt] = useState<Date | null>(null);
  const [isDiscussionPhase, setIsDiscussionPhase] = useState(false);
  const [teams, setTeams] = useState<TeamEntry[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNamingModalOpen, setIsNamingModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [debugLineInput, setDebugLineInput] = useState('');

  const [participantCount, setParticipantCount] = useState(0);
  const [participantName, setParticipantName] = useState('Player');

  const { play: playMusic, fadeOut: fadeOutMusic } = useGameMusic();
  const { playCongratulations } = useCongratulationsVoice();

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  // Host detection
  const [hostId, setHostId] = useState<string | null>(null);

  // Refs to avoid stale closures inside realtime callbacks
  const questionIndexRef = useRef(0);
  const selectedAnswerRef = useRef<number | null>(null);

  useEffect(() => {
    questionIndexRef.current = questionIndex;
  }, [questionIndex]);

  useEffect(() => {
    selectedAnswerRef.current = selectedAnswer;
  }, [selectedAnswer]);


  // Fetch room data if not passed in state
  useEffect(() => {
    const fetchRoomData = async () => {
      if (!roomCode) return;

      try {
        // Get room info including game mode
        const { data: room, error: roomError } = await supabase
          .from('game_rooms')
          .select('id, quiz_id, game_mode, host_id')
          .eq('room_code', roomCode.toUpperCase())
          .maybeSingle();

        if (roomError) throw roomError;
        if (!room) {
          toast.error('Room not found');
          navigate('/');
          return;
        }

        setRoomId(room.id);
        setHostId(room.host_id);
        setGameMode((room.game_mode as 'classic' | 'team' | 'coop') || 'classic');

        // Get quiz to know total questions
        if (room.quiz_id) {
          const { data: quiz } = await supabase
            .from('quizzes')
            .select('questions')
            .eq('id', room.quiz_id)
            .maybeSingle();

          if (quiz?.questions) {
            const questions = quiz.questions as unknown as any[];
            setTotalQuestions(questions.length);
          }
        }

        // Find participant record if not passed
        if (!participantDbId) {
          // Try fetching by authenticated user first
          if (user?.id) {
            const { data: participant } = await supabase
              .from('room_participants')
              .select('id, team_id, name')
              .eq('room_id', room.id)
              .eq('user_id', user.id)
              .maybeSingle();

            if (participant) {
              setParticipantDbId(participant.id);
              setTeamId(participant.team_id);
              setParticipantName(participant.name);

              // Store in local storage for future retrieval just in case auth fails
              localStorage.setItem(`zappy_participant_${room.id}`, participant.id);

              // Check if user is team leader
              if (participant.team_id) {
                const { data: team } = await supabase
                  .from('teams')
                  .select('leader_id')
                  .eq('id', participant.team_id)
                  .single();

                setIsTeamLeader(team?.leader_id === participant.id);
              }
            }
          } else if (roomId) {
            // Fallback: Check local storage for guest session
            const savedId = localStorage.getItem(`zappy_participant_${roomId}`);
            if (savedId) {
              console.log('Recovered participant ID from localStorage:', savedId);
              setParticipantDbId(savedId);

              // Fetch team info for this guest
              const { data: participant } = await supabase
                .from('room_participants')
                .select('team_id, name')
                .eq('id', savedId)
                .maybeSingle();

              if (participant) {
                setTeamId(participant.team_id);
                setParticipantName(participant.name);
              }
            }
          }
        }

        // ALWAYS verify/fetch team ID if in team/coop mode, even if participantDbId was recovered
        // This ensures the chatbox and other team features work correctly after a refresh
        if (participantDbId && (room.game_mode === 'team' || room.game_mode === 'coop')) {
          console.log('Verifying team info for participant:', participantDbId);
          const { data: participant } = await supabase
            .from('room_participants')
            .select('team_id')
            .eq('id', participantDbId)
            .maybeSingle();

          if (participant?.team_id) {
            setTeamId(participant.team_id);

            // Check if user is team leader
            const { data: team } = await supabase
              .from('teams')
              .select('leader_id')
              .eq('id', participant.team_id)
              .maybeSingle();

            if (team) {
              setIsTeamLeader(team.leader_id === participantDbId);
            }
          }
        }

        // Get initial game state
        const { data: gameState } = await supabase
          .from('game_state')
          .select('*')
          .eq('room_id', room.id)
          .maybeSingle();

        if (gameState) {
          handleGameStateUpdate(gameState as unknown as GameState);
        }

        // Get participant count
        const { count } = await supabase
          .from('room_participants')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room.id);

        setParticipantCount(count || 0);
      } catch (error) {
        console.error('Error fetching room data:', error);
      }
    };

    fetchRoomData();
  }, [roomCode, navigate, user?.id, participantDbId]);


  const fetchTeamsWithMembers = useCallback(async () => {
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

    const teamsWithMembers: TeamEntry[] = teamsData.map((team, index) => ({
      ...team,
      rank: index + 1,
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
  }, [roomId]);

  // Helper function to fetch participant's team info (used when teams are assigned mid-game)
  const fetchMyTeamInfo = useCallback(async () => {
    if (!roomId || !participantDbId) return;

    const { data: participant } = await supabase
      .from('room_participants')
      .select('team_id')
      .eq('id', participantDbId)
      .single();

    if (participant?.team_id && participant.team_id !== teamId) {
      setTeamId(participant.team_id);

      // Check if user is team leader
      const { data: team } = await supabase
        .from('teams')
        .select('leader_id')
        .eq('id', participant.team_id)
        .single();

      setIsTeamLeader(team?.leader_id === participantDbId);
    }
  }, [roomId, participantDbId, teamId]);

  const fetchLeaderboard = useCallback(async () => {
    if (!roomId) return;

    const { data } = await supabase
      .from('room_participants')
      .select('id, name, avatar_id, score, current_streak, max_streak')
      .eq('room_id', roomId)
      .order('score', { ascending: false });

    if (data) {
      setLeaderboard(
        data.map((p, i) => ({
          id: p.id,
          name: p.name,
          score: p.score,
          rank: i + 1,
          avatarId: p.avatar_id,
          currentStreak: p.current_streak,
          maxStreak: p.max_streak,
        }))
      );

      // Find highest streak holder
      const maxStreak = Math.max(...data.map(p => p.max_streak || 0));
      const holder = data.find(p => p.max_streak === maxStreak && maxStreak > 0);
      setHighestStreakHolder(holder?.id || null);
    }

    // Also fetch teams if in team mode
    if (gameMode === 'team' || gameMode === 'coop') {
      await fetchTeamsWithMembers();
    }
  }, [roomId, gameMode, fetchTeamsWithMembers]);

  // Handle game state updates (drives the participant UI)
  const handleGameStateUpdate = useCallback(
    (state: GameState) => {
      console.log('Game state update:', state);

      // Update chat and discussion state from game_state
      setChatEnabled(state.chat_enabled || false);
      if (state.discussion_ends_at) {
        setDiscussionEndsAt(new Date(state.discussion_ends_at));
      } else {
        setDiscussionEndsAt(null);
      }

      // Handle instruction phase
      if (state.phase === 'instructions') {
        console.log('Transitioning to instructions phase');
        setPhase('instructions');
        setIsDiscussionPhase(false);
        // Start music on instructions if it's the beginning of the game
        if (questionIndexRef.current === 0) {
          playMusic();
          // Also fetch team info early if needed
          if (!teamId) {
            fetchMyTeamInfo();
          }
        }
        return;
      }

      // Handle team naming phase
      if (state.phase === 'team_naming') {
        setPhase('team_naming');
        setIsDiscussionPhase(false);
        if (state.discussion_ends_at) {
          setDiscussionEndsAt(new Date(state.discussion_ends_at));
        }

        // Ensure team info is fetched so we know if user is leader
        if (!teamId) {
          fetchMyTeamInfo();
        }
        // Force leader check update
        if (participantDbId && teamId) {
          const checkLeader = async () => {
            const { data: team } = await supabase
              .from('teams')
              .select('leader_id, name')
              .eq('id', teamId)
              .single();

            if (team) {
              setIsTeamLeader(team.leader_id === participantDbId);
              // Pre-fill team name for leader if they haven't started typing
              if (team.leader_id === participantDbId && !newTeamName) {
                setNewTeamName(team.name);
              }
            }
          };
          checkLeader();
        }

        return;
      }


      // Handle team naming phase
      if (state.phase === 'team_naming') {
        setPhase('team_naming');
        setIsDiscussionPhase(false);
        if (state.discussion_ends_at) {
          setDiscussionEndsAt(new Date(state.discussion_ends_at));
        }

        // Ensure team info is fetched so we know if user is leader
        if (!teamId) {
          fetchMyTeamInfo();
        }
        // Force leader check update
        if (participantDbId && teamId) {
          const checkLeader = async () => {
            const { data: team } = await supabase
              .from('teams')
              .select('leader_id, name')
              .eq('id', teamId)
              .single();

            if (team) {
              setIsTeamLeader(team.leader_id === participantDbId);
              // Pre-fill team name for leader if they haven't started typing
              if (team.leader_id === participantDbId && !newTeamName) {
                setNewTeamName(team.name);
              }
            }
          };
          checkLeader();
        }

        return;
      }

      // Handle discussion phase (Co-op mode)
      if (state.phase === 'discussion' && state.current_question) {
        const newIndex = state.current_question_index;
        const prevIndex = questionIndexRef.current;

        // PROTECTION: If we've already locally synced to question phase for this question index, stay there
        if (phase === 'question' && newIndex === questionIndex) {
          console.log('Syncing: Staying in question phase after local auto-transition');
          return;
        }

        setPhase('discussion');
        setIsDiscussionPhase(true);
        setCurrentQuestion(state.current_question);
        setQuestionIndex(newIndex);
        setCorrectAnswer(null);
        setQuestionStartedAt(state.question_started_at);

        // Update total questions from metadata if missing
        const qMeta = state.current_question as any;
        if (qMeta?.totalQuestions && totalQuestions === 0) {
          setTotalQuestions(qMeta.totalQuestions);
        }

        // Start music on first question
        if (newIndex === 0 && prevIndex === 0) {
          playMusic();
        }

        // Fetch team info on first discussion phase (teams may have just been assigned)
        if (newIndex === 0 && !teamId) {
          fetchMyTeamInfo();
        }

        // If it's a new question, reset answer state
        if (newIndex !== prevIndex) {
          setSelectedAnswer(null);
          setIsCorrect(null);
          setPointsEarned(0);
          setTimerKey((prev) => prev + 1);
          questionIndexRef.current = newIndex;
        }
        return;
      }

      if (state.phase === 'question' && state.current_question) {
        const newIndex = state.current_question_index;
        const prevIndex = questionIndexRef.current;

        setPhase('question');
        setIsDiscussionPhase(false);
        setIsChatOpen(false);
        setCurrentQuestion(state.current_question);
        setQuestionIndex(newIndex);
        setCorrectAnswer(null);
        setQuestionStartedAt(state.question_started_at);

        // Update total questions from metadata if missing
        const qMeta = state.current_question as any;
        if (qMeta?.totalQuestions && totalQuestions === 0) {
          setTotalQuestions(qMeta.totalQuestions);
        }

        // Start music on first question
        if (newIndex === 0 && prevIndex === 0) {
          playMusic();
        }

        // If it’s a new question, reset answer state + restart timer
        if (newIndex !== prevIndex) {
          setSelectedAnswer(null);
          setIsCorrect(null);
          setPointsEarned(0);
          setTimerKey((prev) => prev + 1);
          questionIndexRef.current = newIndex;
        }
        return;
      }

      if (state.phase === 'results') {
        setCorrectAnswer(state.correct_answer);
        setPhase('results');
        setIsDiscussionPhase(false);
        setIsChatOpen(false);

        const myAnswer = selectedAnswerRef.current;
        if (myAnswer !== null && state.correct_answer !== null) {
          const correct = myAnswer === state.correct_answer;
          setIsCorrect(correct);
        }

        // Always fetch actual points earned from database to show correct points
        if (participantDbId) {
          const currentQIndex = questionIndexRef.current;
          const fetchPoints = async () => {
            // Improved polling with exponential backoff and longer total duration
            // Host logic can take a few seconds to process all answers
            const maxAttempts = 10;
            const baseDelay = 500;

            // In Co-op mode, we need to look for the leader's answer
            let searchParticipantId = participantDbId;
            if (gameMode === 'coop' && teamId) {
              const { data: teamData } = await supabase
                .from('teams')
                .select('leader_id')
                .eq('id', teamId)
                .single();

              if (teamData?.leader_id) {
                searchParticipantId = teamData.leader_id;
              }
            }

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
              // Delay: 500, 800, 1100, 1400... up to ~3.2s
              const delay = baseDelay + (attempt * 300);
              await new Promise(resolve => setTimeout(resolve, delay));

              const { data, error } = await supabase
                .from('participant_answers')
                .select('points_earned, is_correct, answer_index')
                .eq('participant_id', searchParticipantId)
                .eq('question_index', currentQIndex)
                .maybeSingle();

              if (error) {
                console.error('Error fetching score:', error);
                continue;
              }

              // Check if score has been assigned (is_correct not null)
              if (data && data.is_correct !== null) {
                console.log(`Score fetched for ${searchParticipantId} on attempt ${attempt + 1}:`, data);
                setPointsEarned(data.points_earned || 0);
                setIsCorrect(data.is_correct);

                // Also sync local selected answer if in coop and didn't answer (teammate)
                if (gameMode === 'coop' && !isTeamLeader && selectedAnswer === null) {
                  setSelectedAnswer(data.answer_index);
                }
                break;
              }
            }
          };
          fetchPoints();
        }
        return;
      }

      if (state.phase === 'leaderboard') {
        setPhase('leaderboard');
        setIsDiscussionPhase(false);
        setIsChatOpen(false);
        fetchLeaderboard();
        return;
      }

      if (state.phase === 'finished') {
        setPhase('finished');
        setIsDiscussionPhase(false);
        setIsChatOpen(false);
        fetchLeaderboard();
        // Fade out music
        fadeOutMusic();
        // Play congratulations voice
        setTimeout(() => {
          playCongratulations();
        }, 800);
        // Trigger confetti celebration for 3 seconds
        const duration = 3000;
        const end = Date.now() + duration;
        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B'],
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B'],
          });
          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
        return;
      }

      // Fallback
      setPhase('waiting');
      setIsDiscussionPhase(false);
    },
    [fetchLeaderboard, playMusic, fadeOutMusic, playCongratulations, fetchMyTeamInfo, teamId, gameMode]
  );

  // Sync phase transitions locally based on absolute timestamps to ensure all players switch simultaneously
  useEffect(() => {
    if (!discussionEndsAt || (phase !== 'instructions' && phase !== 'discussion')) return;

    const interval = setInterval(() => {
      const now = new Date();
      if (now >= discussionEndsAt) {
        if (phase === 'instructions') {
          // Instructions ended, move to next phase (discussion for co-op, question for others)
          const nextPhase = gameMode === 'coop' ? 'discussion' : 'question';
          console.log(`Local sync: moving from instructions to ${nextPhase}`);
          setPhase(nextPhase);
          if (nextPhase === 'discussion') setIsDiscussionPhase(true);
          setTimerKey(prev => prev + 1);
        } else if (phase === 'discussion') {
          // Discussion ended, move to question phase
          console.log('Local sync: moving from discussion to question');
          setPhase('question');
          setIsDiscussionPhase(false);
          setTimerKey(prev => prev + 1);
          // For countdown timer, we use discussionEndsAt as the starting point until updated by server
          setQuestionStartedAt(discussionEndsAt.toISOString());
        }
      }
    }, 100); // Check every 100ms for tight sync

    return () => clearInterval(interval);
  }, [phase, discussionEndsAt, gameMode]);

  // Subscribe to game state changes (realtime)
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`live_game_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_state',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.new) {
            const newState = payload.new as GameState;
            console.log('Realtime game state received:', newState);
            handleGameStateUpdate(newState);
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, handleGameStateUpdate]);

  // Poll fallback (prevents getting stuck if realtime is flaky)
  useEffect(() => {
    if (!roomId) return;

    const interval = window.setInterval(async () => {
      const { data } = await supabase
        .from('game_state')
        .select('*')
        .eq('room_id', roomId)
        .maybeSingle();

      if (data) handleGameStateUpdate(data as unknown as GameState);
    }, 2500);

    return () => window.clearInterval(interval);
  }, [roomId, handleGameStateUpdate, phase, questionIndex]);

  const handleRenameTeam = async () => {
    if (!teamId || !newTeamName.trim()) return;

    try {
      const { error } = await supabase
        .from('teams')
        .update({ name: newTeamName.trim() })
        .eq('id', teamId);

      if (error) throw error;
      toast.success('Team renamed!');
      setIsNamingModalOpen(false);
    } catch (error) {
      console.error('Error renaming team:', error);
      toast.error('Failed to rename team');
    }
  };

  const handleTimeUp = async () => {
    if (selectedAnswer === null) {
      setIsCorrect(false);
      setPointsEarned(0);
    }
    
    // DEAD-MAN'S SWITCH
    // If the host abruptly disconnected, they won't trigger the transition.
    // By having the client trigger the locking RPC upon timer completion, 
    // the game securely forces the state to Results for everyone simultaneously!
    if (roomId && phase === 'question') {
      try {
        await (supabase.rpc as any)('process_question_results', {
          p_room_id: roomId,
          p_question_index: questionIndex
        });
      } catch (err) {
        console.error('Error triggering fallback sync:', err);
      }
    }
  };

  const handleAnswerSelect = async (index: number) => {
    // In Co-op mode, only team leader can submit
    if (gameMode === 'coop' && !isTeamLeader) {
      toast.error('Only the team leader can submit the answer!');
      return;
    }

    // Can't answer during discussion phase
    if (phase === 'discussion') {
      toast.error('Wait for discussion to end!');
      return;
    }

    if (selectedAnswer !== null || phase !== 'question' || !currentQuestion || !roomId || !participantDbId) return;

    setSelectedAnswer(index);

    try {
      // Submit answer to database
      const { error } = await supabase
        .from('participant_answers')
        .insert({
          room_id: roomId,
          participant_id: participantDbId,
          question_index: questionIndex,
          answer_index: index,
        });

      if (error) {
        console.error('Error submitting answer:', error);
        // Check if it's an RLS error
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          toast.error('Authentication error. Please rejoin the game.');
        } else {
          toast.error('Failed to submit answer');
        }
        setSelectedAnswer(null); // Allow retry
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('Failed to submit answer');
      setSelectedAnswer(null); // Allow retry
    }
  };

  const handleDebugSubmit = () => {
    if (!debugLineInput) return;
    const line = parseInt(debugLineInput);
    if (isNaN(line)) {
      toast.error('Please enter a valid line number');
      return;
    }
    handleAnswerSelect(line);
  };

  // Waiting state - show unless we are in a visual phase that purposefully has no question
  const isVisualPhaseNoQuestion = ['instructions', 'leaderboard', 'finished', 'team_naming', 'team_formation'].includes(phase);
  if (phase === 'waiting' || (!currentQuestion && !isVisualPhaseNoQuestion)) {
    console.log('Rendering waiting lobby. Phase:', phase, 'CurrentQuestion:', !!currentQuestion);
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Zap className="w-16 h-16 text-primary animate-pulse mb-4" />
        <p className="text-muted-foreground">Waiting for the next question...</p>
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
            Zappy
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {participantCount} players
            </span>
            <span className="font-mono bg-muted px-2 py-1 rounded text-foreground">
              {roomCode || '------'}
            </span>
          </div>
        </div>
      </header>

      {/* Chat toggle for mobile (Co-op mode only) */}
      {gameMode === 'coop' && teamId && participantDbId && (phase === 'discussion' || phase === 'question') && (
        <div className="md:hidden fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            className="rounded-full w-14 h-14 shadow-xl neon-glow"
            onClick={() => setIsChatOpen(!isChatOpen)}
          >
            <MessageCircle className="w-6 h-6" />
            {chatEnabled && phase === 'discussion' && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse border-2 border-background" />
            )}
          </Button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col">
        <AnimatePresence mode="wait">
          {phase === 'team_naming' && (
            <motion.div
              key="team_naming"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex-1 flex flex-col items-center justify-center p-6 text-center"
            >
              {isTeamLeader ? (
                <div className="w-full max-w-md space-y-8">
                  <div className="glass-card p-8 border-primary/20 bg-primary/5">
                    <h2 className="text-3xl font-display font-bold mb-2">Name Your Team</h2>
                    <p className="text-muted-foreground mb-6">You have 15 seconds to choose a legendary name!</p>

                    <div className="space-y-4">
                      <Input
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="Enter team name..."
                        className="text-2xl font-bold text-center h-16 bg-background/50"
                        maxLength={20}
                        autoFocus
                      />
                      <Button
                        size="lg"
                        className="w-full h-12 text-lg neon-glow"
                        onClick={handleRenameTeam}
                      >
                        Save Name
                      </Button>
                    </div>

                    <div className="mt-8 flex items-center justify-center gap-2">
                      <Clock className="w-5 h-5 text-primary animate-pulse" />
                      <span className="font-mono text-xl text-primary font-bold">
                        {discussionEndsAt && <DiscussionTimer endsAt={discussionEndsAt} />}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <PenLine className="w-12 h-12 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-display font-bold mb-2">Naming Phase</h2>
                    <p className="text-xl text-muted-foreground">Waiting for team leader to name your team...</p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-6 py-3 bg-muted/30 rounded-full">
                    <Clock className="w-5 h-5 text-primary" />
                    <span className="font-mono text-xl font-bold">
                      {discussionEndsAt && <DiscussionTimer endsAt={discussionEndsAt} />}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {phase === 'instructions' && (
            <InstructionsScreen
              key="instructions"
              gameMode={gameMode}
              isLeader={isTeamLeader}
              endsAt={discussionEndsAt}
            />
          )}

          {/* Team Naming Modal */}
          <Dialog open={isNamingModalOpen} onOpenChange={setIsNamingModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Name Your Team</DialogTitle>
                <DialogDescription>
                  Give your team a legendary name!
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center space-x-2 py-4">
                <div className="grid flex-1 gap-2">
                  <Label htmlFor="teamName" className="sr-only">
                    Team Name
                  </Label>
                  <Input
                    id="teamName"
                    placeholder="Enter team name..."
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    maxLength={20}
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter className="sm:justify-end">
                <Button
                  type="button"
                  onClick={handleRenameTeam}
                  disabled={!newTeamName.trim()}
                  className=" neon-glow"
                >
                  Save Name
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Discussion Phase (Co-op Mode) */}
          {phase === 'discussion' && currentQuestion && (
            <motion.div
              key="discussion"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex gap-4"
            >
              {/* Main content */}
              <div className="flex-1 flex flex-col">
                {/* Discussion Timer */}
                <div className="flex justify-center mb-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-full">
                    <MessageCircle className="w-5 h-5 text-amber-500" />
                    <span className="text-amber-500 font-semibold">Discussion Phase</span>
                    {discussionEndsAt && (
                      <DiscussionTimer endsAt={discussionEndsAt} />
                    )}
                  </div>
                </div>

                {/* Question */}
                <QuestionDisplay
                  questionText={currentQuestion.text}
                  questionNumber={questionIndex + 1}
                  totalQuestions={totalQuestions}
                  imageUrl={currentQuestion.imageUrl}
                  type={currentQuestion.type}
                  codeSnippet={currentQuestion.type === 'code-debug' ? currentQuestion.codeSnippet : undefined}
                />

                {/* Answer preview (disabled during discussion) */}
                <div className="mt-auto opacity-50">
                  {currentQuestion.type === 'multiple-choice' ? (
                    <AnswerButtons
                      options={currentQuestion.options}
                      selectedAnswer={null}
                      correctAnswer={null}
                      onSelect={() => { }}
                      disabled={true}
                    />
                  ) : (
                    <div className="p-4 bg-black/20 rounded-lg text-center border border-white/5 mx-auto max-w-sm">
                      <p className="text-sm font-mono text-muted-foreground flex items-center justify-center gap-2">
                        <PenLine className="w-4 h-4" />
                        Discuss the error line number...
                      </p>
                    </div>
                  )}
                </div>

                {isTeamLeader && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center mt-4 text-amber-500 flex items-center justify-center gap-2"
                  >
                    <Crown className="w-5 h-5" />
                    You are the team leader. You'll submit the answer after discussion.
                  </motion.div>
                )}
                {!isTeamLeader && gameMode === 'coop' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center mt-4 text-muted-foreground"
                  >
                    Discuss with your team! The leader will submit the answer.
                  </motion.div>
                )}
              </div>

            </motion.div>
          )}

          {(phase === 'question') && currentQuestion && (
            <motion.div
              key="question"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex gap-4"
            >
              {/* Main content */}
              <div className="flex-1 flex flex-col">
                {/* Timer */}
                <div className="flex justify-center mb-6">
                  <CountdownTimer
                    key={timerKey}
                    duration={currentQuestion.timeLimit}
                    serverStartTime={questionStartedAt}
                    onComplete={handleTimeUp}
                  />
                </div>

                {/* Co-op mode: show leader indicator */}
                {gameMode === 'coop' && isTeamLeader && (
                  <div className="flex justify-center mb-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-primary/20 border border-primary/30 rounded-full text-sm">
                      <Crown className="w-4 h-4 text-primary" />
                      <span className="text-primary font-medium">You are submitting for your team</span>
                    </div>
                  </div>
                )}

                {/* Question */}
                <QuestionDisplay
                  questionText={currentQuestion.text}
                  questionNumber={questionIndex + 1}
                  totalQuestions={totalQuestions}
                  imageUrl={currentQuestion.imageUrl}
                  type={currentQuestion.type}
                  codeSnippet={currentQuestion.type === 'code-debug' ? currentQuestion.codeSnippet : undefined}
                />

                {/* Answer Buttons or Input */}
                <div className="mt-auto">
                  {currentQuestion.type === 'multiple-choice' ? (
                    <AnswerButtons
                      options={currentQuestion.options}
                      selectedAnswer={selectedAnswer}
                      correctAnswer={null}
                      onSelect={handleAnswerSelect}
                      disabled={selectedAnswer !== null || (gameMode === 'coop' && !isTeamLeader)}
                    />
                  ) : (
                    <div className="flex flex-col gap-4 max-w-xs mx-auto w-full">
                      <Label className="text-center text-muted-foreground">Enter Error Line Number</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Line #"
                          min={1}
                          className="font-mono text-lg bg-background/50 h-12"
                          value={debugLineInput}
                          onChange={(e) => setDebugLineInput(e.target.value)}
                          disabled={selectedAnswer !== null || (gameMode === 'coop' && !isTeamLeader)}
                          onKeyDown={(e) => e.key === 'Enter' && handleDebugSubmit()}
                        />
                        <Button
                          size="lg"
                          className="h-12 px-6"
                          onClick={handleDebugSubmit}
                          disabled={selectedAnswer !== null || !debugLineInput || (gameMode === 'coop' && !isTeamLeader)}
                        >
                          Submit
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {selectedAnswer !== null && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center mt-6 text-muted-foreground"
                  >
                    Answer submitted! Waiting for results...
                  </motion.div>
                )}

                {gameMode === 'coop' && !isTeamLeader && selectedAnswer === null && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center mt-6 text-muted-foreground"
                  >
                    Waiting for team leader to submit...
                  </motion.div>
                )}
              </div>

            </motion.div>
          )}

          {phase === 'results' && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex-1 flex flex-col items-center justify-center"
            >
              {correctAnswer !== null ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                    className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 ${isCorrect
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-destructive/20 text-destructive'
                      }`}
                  >
                    {isCorrect ? (
                      <Trophy className="w-16 h-16" />
                    ) : (
                      <span className="text-5xl font-bold">✗</span>
                    )}
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="font-display text-3xl font-bold mb-2"
                  >
                    {isCorrect ? 'Correct!' : selectedAnswer === null ? 'Time\'s up!' : 'Oops!'}
                  </motion.h2>

                  {isCorrect && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-xl text-primary font-semibold"
                    >
                      +{pointsEarned} points
                    </motion.p>
                  )}

                  {currentQuestion.type === 'multiple-choice' && correctAnswer !== null ? (
                    <>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-muted-foreground mt-4"
                      >
                        Correct answer: <span className="text-foreground font-medium">{currentQuestion.options?.[correctAnswer]}</span>
                      </motion.p>

                      {/* Show answers with reveal */}
                      <div className="mt-6 w-full max-w-2xl">
                        <AnswerButtons
                          options={currentQuestion.options}
                          selectedAnswer={selectedAnswer}
                          correctAnswer={correctAnswer}
                          onSelect={() => { }}
                          disabled={true}
                        />
                      </div>
                    </>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="mt-6 w-full max-w-md"
                    >
                      <div className="glass-card p-6 border-primary/20 bg-primary/5 rounded-xl text-center">
                        <p className="text-muted-foreground mb-2">The error was on line</p>
                        <p className="text-4xl font-mono font-bold text-primary mb-4">{correctAnswer}</p>

                        {(currentQuestion as any).correctedCode && (
                          <div className="mt-4 text-left bg-black/40 p-4 rounded-lg border border-white/10">
                            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Solution</p>
                            <pre className="font-mono text-sm overflow-x-auto text-green-400">
                              {(currentQuestion as any).correctedCode}
                            </pre>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </>
              ) : (
                <div className="text-center">
                  <Zap className="w-16 h-16 text-primary animate-pulse mx-auto mb-4" />
                  <p className="text-muted-foreground">Waiting for results...</p>
                </div>
              )}
            </motion.div>
          )}

          {phase === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center py-8"
            >
              <h2 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                {(gameMode === 'team' || gameMode === 'coop') ? 'Team Rankings' : 'Leaderboard'}
              </h2>

              <div className="w-full max-w-md">
                {(gameMode === 'team' || gameMode === 'coop') && teams.length > 0 ? (
                  <TeamLeaderboard
                    teams={teams}
                    currentTeamId={teamId || undefined}
                    showMembers={false}
                  />
                ) : leaderboard.length > 0 ? (
                  <EnhancedLeaderboard
                    entries={leaderboard.map(e => ({
                      ...e,
                      avatarId: e.avatarId || 0,
                      currentStreak: e.currentStreak,
                      maxStreak: e.maxStreak,
                    }))}
                    currentUserId={participantDbId || undefined}
                    showStreaks
                    highestStreakHolder={highestStreakHolder || undefined}
                  />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading leaderboard...</p>
                  </div>
                )}
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 text-muted-foreground"
              >
                Next question coming up...
              </motion.p>
            </motion.div>
          )}

          {phase === 'finished' && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center py-8"
            >
              {/* Team mode - show team final leaderboard */}
              {(gameMode === 'team' || gameMode === 'coop') && teams.length > 0 ? (
                <div className="w-full max-w-lg">
                  <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-display text-3xl md:text-4xl font-bold gradient-text mb-8 text-center"
                  >
                    🎉 Final Team Results
                  </motion.h1>
                  <TeamFinalLeaderboard
                    teams={teams}
                    currentTeamId={teamId || undefined}
                    currentParticipantId={participantDbId || undefined}
                  />
                </div>
              ) : leaderboard.length > 0 ? (
                <>
                  <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-display text-3xl md:text-4xl font-bold gradient-text mb-8"
                  >
                    🎉 Final Results
                  </motion.h1>

                  <div className="flex justify-center items-end gap-1.5 sm:gap-3 mb-8 h-48 sm:h-56">
                    {[1, 0, 2].map((index, position) => {
                      const player = leaderboard[index];
                      if (!player) return null;

                      const podiumHeights = ['h-28', 'h-20', 'h-16'];
                      const rankColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];
                      const RankIcon = index === 0 ? Trophy : index === 1 ? Medal : Award;
                      const delay = position * 0.2;

                      return (
                        <motion.div
                          key={player.id}
                          initial={{ opacity: 0, y: 50 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay, type: 'spring', bounce: 0.4 }}
                          className="flex flex-col items-center"
                        >
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: delay + 0.2, type: 'spring', bounce: 0.5 }}
                            className={index === 0 ? 'scale-110' : ''}
                          >
                            <AnimatedAvatar
                              avatarId={player.avatarId || 0}
                              size={index === 0 ? 'md' : 'sm'}
                              smSize={index === 0 ? 'lg' : 'md'}
                              rank={player.rank}
                            />
                          </motion.div>

                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: delay + 0.3 }}
                            className="text-center my-2"
                          >
                            <p className="font-semibold text-sm">{player.name}</p>
                            <p className="text-primary font-bold">{player.score.toLocaleString()}</p>
                          </motion.div>

                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            transition={{ delay: delay + 0.1, duration: 0.5 }}
                            className={`w-16 sm:w-20 md:w-24 ${podiumHeights[index]} rounded-t-xl bg-gradient-to-t from-primary/30 to-primary/10 border border-primary/20 flex items-start justify-center pt-2`}
                          >
                            <RankIcon className={`w-6 h-6 ${rankColors[index]}`} />
                          </motion.div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Full leaderboard (top 10) */}
                  {leaderboard.length > 3 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 }}
                      className="w-full max-w-sm mb-6"
                    >
                      <div className="glass-card rounded-xl overflow-hidden">
                        {leaderboard.slice(3, 10).map((player, i) => (
                          <motion.div
                            key={player.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.9 + i * 0.05 }}
                            className={`flex items-center gap-3 p-3 border-b border-border/50 last:border-0 ${player.id === participantDbId ? 'bg-primary/10' : ''
                              }`}
                          >
                            <span className="w-6 text-center font-bold text-muted-foreground text-sm">
                              #{player.rank}
                            </span>
                            <AnimatedAvatar avatarId={player.avatarId || 0} size="sm" />
                            <span className="flex-1 font-medium text-sm">{player.name}</span>
                            <span className="font-bold text-primary text-sm">
                              {player.score.toLocaleString()}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </>
              ) : (
                <div className="text-center">
                  <Trophy className="w-20 h-20 text-yellow-500 mb-4 mx-auto" />
                  <h2 className="font-display text-3xl font-bold mb-2">Game Over!</h2>
                  <p className="text-muted-foreground">Thanks for playing!</p>
                </div>
              )}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="flex flex-wrap justify-center gap-4 mt-auto"
              >
                <Button variant="outline" size="lg" onClick={() => navigate('/')}>
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
                <Button size="lg" className="neon-glow" onClick={() => navigate(0)}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Play Again
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary/50 text-primary hover:bg-primary/10"
                  onClick={() => setShowShareModal(true)}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Result
                </Button>
              </motion.div>

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Persistent Team Chat (Desktop Sidebar & Mobile Drawer) */}
      {gameMode === 'coop' && teamId && participantDbId && (phase === 'discussion' || phase === 'question' || phase === 'results') && (
        <>
          {/* Desktop Sidebar */}
          <div className="hidden lg:block fixed right-4 top-24 bottom-4 w-80 z-20">
            <TeamChat
              roomId={roomId!}
              teamId={teamId}
              participantId={participantDbId}
              participantName=""
              isEnabled={phase === 'discussion'}
              discussionEndsAt={phase === 'discussion' ? discussionEndsAt : null}
              questionIndex={questionIndex}
            />
          </div>

          {/* Mobile/Tablet Toggle Button */}
          <Button
            size="icon"
            variant="secondary"
            className="lg:hidden fixed bottom-24 right-4 z-30 shadow-lg rounded-full w-12 h-12"
            onClick={() => setIsChatOpen(true)}
          >
            <MessageCircle className="w-6 h-6" />
          </Button>

          {/* Chat Drawer Overlay */}
          <AnimatePresence>
            {isChatOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden"
                onClick={(e) => e.target === e.currentTarget && setIsChatOpen(false)}
              >
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-card shadow-2xl p-4 flex flex-col"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Team Chat</h2>
                    <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)}>
                      <X className="w-6 h-6" />
                    </Button>
                  </div>
                  <div className="flex-1 min-h-0">
                    <TeamChat
                      roomId={roomId!}
                      teamId={teamId}
                      participantId={participantDbId}
                      participantName={participantName}
                      isEnabled={phase === 'discussion'}
                      discussionEndsAt={phase === 'discussion' ? discussionEndsAt : null}
                      questionIndex={questionIndex}
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Share Modal */}
      {(() => {
        const hasParticipantId = !!participantDbId;
        const cardType = hasParticipantId ? 'player' : 'host';
        return (
          <ShareModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            type={cardType}
            data={{
              quizTitle: 'Live Quiz',
              // Host Data
              hostName: 'Host',
              winners: leaderboard.slice(0, 3).map(p => ({
                name: p.name,
                avatarId: p.avatarId || 1,
                score: p.score
              })),
              // Player Data
              playerName: leaderboard.find(p => p.id === participantDbId)?.name || 'Player',
              avatarId: leaderboard.find(p => p.id === participantDbId)?.avatarId || 1,
              score: leaderboard.find(p => p.id === participantDbId)?.score || 0,
              rank: leaderboard.find(p => p.id === participantDbId)?.rank || 0,
              titles: [],
              // Common
              totalPlayers: participantCount
            }}
          />
        );
      })()}
    </div>
  );
}
