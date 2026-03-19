import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AnimatedAvatar } from '@/components/game/AnimatedAvatar';
import { EndGameCelebration } from '@/components/game/EndGameCelebration';
import { EnhancedLeaderboard } from '@/components/game/EnhancedLeaderboard';
import { TitleBadge, TitleType } from '@/components/game/PlayerTitles';
import { Zap, Trophy, Medal, Award, Home, RotateCcw, Share2, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface WinnerEntry {
  id: string;
  name: string;
  score: number;
  rank: number;
  avatarId: number;
  maxStreak?: number;
  avgResponseTime?: number;
  totalCorrect?: number;
  totalAnswers?: number;
  teamId?: string;
}

interface PlayerTitle {
  participantId: string;
  titleType: TitleType;
  playerName: string;
}

import { ShareModal } from '@/components/sharing/ShareModal';
import { useAuth } from '@/contexts/AuthContext';

import { TeamFinalLeaderboard } from '@/components/game/TeamFinalLeaderboard';
import type { TeamEntry } from '@/components/game/TeamLeaderboard';

export default function Results() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [allPlayers, setAllPlayers] = useState<WinnerEntry[]>([]);
  const [teams, setTeams] = useState<TeamEntry[]>([]);
  const [gameMode, setGameMode] = useState<'classic' | 'team' | 'coop'>('classic');
  const [titles, setTitles] = useState<PlayerTitle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(true);
  const [highestStreakHolder, setHighestStreakHolder] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [hostId, setHostId] = useState<string | null>(null);
  const [currentParticipant, setCurrentParticipant] = useState<WinnerEntry | null>(null);

  // Fetch real participants from database
  useEffect(() => {
    const fetchResults = async () => {
      if (!roomCode) {
        setIsLoading(false);
        return;
      }

      try {
        // Get room by code
        const { data: room, error: roomError } = await supabase
          .from('game_rooms')
          .select('id, host_id, game_mode')
          .eq('room_code', roomCode.toUpperCase())
          .maybeSingle();

        if (roomError) throw roomError;

        if (!room) {
          console.error('Room not found');
          setIsLoading(false);
          return;
        }

        setHostId(room.host_id);
        setGameMode(room.game_mode as 'classic' | 'team' | 'coop');

        // Fetch participants sorted by score with stats
        const { data: participants, error: participantsError } = await supabase
          .from('room_participants')
          .select('id, name, avatar_id, score, max_streak, avg_response_time_ms, total_correct, total_answers, user_id, team_id')
          .eq('room_id', room.id)
          .order('score', { ascending: false });

        if (participantsError) throw participantsError;

        if (participants && participants.length > 0) {
          const players = participants.map((p, i) => ({
            id: p.id,
            name: p.name,
            score: p.score,
            rank: i + 1,
            avatarId: p.avatar_id,
            maxStreak: p.max_streak || 0,
            avgResponseTime: p.avg_response_time_ms || 0,
            totalCorrect: p.total_correct || 0,
            totalAnswers: p.total_answers || 0,
            userId: p.user_id,
            teamId: p.team_id
          }));
          setAllPlayers(players);

          if (user) {
            const me = players.find(p => p.userId === user.id);
            if (me) {
              setCurrentParticipant(me);
              // Save to local storage for consistency
              localStorage.setItem(`zappy_participant_${room.id}`, me.id);
            }
          }

          // Fallback: If no participant found via auth, check localStorage
          if (!currentParticipant) {
            const savedId = localStorage.getItem(`zappy_participant_${room.id}`);
            if (savedId) {
              const me = players.find(p => p.id === savedId);
              if (me) {
                console.log('Results - Identified guest player from localStorage:', me.name);
                setCurrentParticipant(me);
              }
            }
          }

          // If team mode, fetch teams data
          if ((room.game_mode === 'team' || room.game_mode === 'coop')) {
            const { data: teamsData } = await supabase
              .from('teams')
              .select('*')
              .eq('room_id', room.id)
              .order('score', { ascending: false });

            if (teamsData) {
              const formattedTeams: TeamEntry[] = teamsData.map((t, i) => {
                const teamMembers = players
                  .filter(p => p.teamId === t.id)
                  .map(p => ({
                    id: p.id,
                    name: p.name,
                    score: p.score,
                    avatarId: p.avatarId
                  }));

                return {
                  id: t.id,
                  name: t.name,
                  color: t.color,
                  score: t.score,
                  rank: i + 1,
                  members: teamMembers
                };
              });
              setTeams(formattedTeams);
            }
          }

          // Compute titles based on ACTUAL performance data
          const computedTitles: PlayerTitle[] = [];

          // Speed Demon: Lowest average response time (must have valid response time data)
          const playersWithValidResponseTime = players.filter(
            p => p.avgResponseTime && p.avgResponseTime > 0 && p.totalAnswers >= 2
          );
          if (playersWithValidResponseTime.length > 0) {
            const speedDemon = playersWithValidResponseTime.reduce((prev, curr) =>
              curr.avgResponseTime! < prev.avgResponseTime! ? curr : prev
            );
            computedTitles.push({
              participantId: speedDemon.id,
              titleType: 'speed_demon',
              playerName: speedDemon.name,
            });
          }

          // Accuracy King: 100% correct answers (must have answered at least 2 questions)
          const perfectPlayers = players.filter(p =>
            p.totalAnswers >= 2 && p.totalCorrect === p.totalAnswers && p.totalCorrect > 0
          );
          if (perfectPlayers.length > 0) {
            // Give to highest scorer among perfect players
            const accuracyKing = perfectPlayers.reduce((best, p) =>
              p.score > best.score ? p : best
            );
            computedTitles.push({
              participantId: accuracyKing.id,
              titleType: 'accuracy_king',
              playerName: accuracyKing.name,
            });
          }

          // Streak Master: Highest max streak (must be at least 3)
          const maxStreakValue = Math.max(...players.map(p => p.maxStreak || 0));
          if (maxStreakValue >= 3) {
            const streakMaster = players.find(p => p.maxStreak === maxStreakValue);
            if (streakMaster) {
              setHighestStreakHolder(streakMaster.id);
              computedTitles.push({
                participantId: streakMaster.id,
                titleType: 'streak_master',
                playerName: streakMaster.name,
              });
            }
          }

          // Most Improved: Player who had low early score but finished strong
          // (simplified: lowest rank player who ended up in top half with good accuracy)
          const halfwayRank = Math.ceil(players.length / 2);
          const mostImprovedCandidates = players.filter(p =>
            p.rank <= halfwayRank &&
            p.totalAnswers >= 2 &&
            p.totalCorrect >= Math.ceil(p.totalAnswers * 0.5) // At least 50% accuracy
          );
          if (mostImprovedCandidates.length > 1 && players.length >= 4) {
            // Find someone who isn't already getting another title
            const existingTitleIds = new Set(computedTitles.map(t => t.participantId));
            const improvedPlayer = mostImprovedCandidates
              .filter(p => !existingTitleIds.has(p.id))
              .sort((a, b) => b.rank - a.rank)[0]; // Lowest ranked among top half

            if (improvedPlayer && improvedPlayer.rank >= 2) {
              computedTitles.push({
                participantId: improvedPlayer.id,
                titleType: 'most_improved',
                playerName: improvedPlayer.name,
              });
            }
          }

          setTitles(computedTitles);
        }
      } catch (error) {
        console.error('Error fetching results:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [roomCode, user]);

  // Trigger confetti when celebration ends
  useEffect(() => {
    if (!showCelebration && allPlayers.length > 0) {
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
    }
  }, [showCelebration, allPlayers]);

  const winners = allPlayers.slice(0, 3);
  const podiumHeights = ['h-32', 'h-24', 'h-20'];
  const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd
  const rankIcons = [Trophy, Medal, Award];
  const rankColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  if (allPlayers.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">No Results Found</h2>
          <p className="text-muted-foreground mb-6">This game doesn't have any participants yet.</p>
          <Button onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // Show celebration animation first
  if (showCelebration) {
    return (
      <EndGameCelebration
        winners={winners}
        allPlayers={allPlayers}
        titles={titles}
        onComplete={() => setShowCelebration(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 font-display text-xl font-bold gradient-text">
            <Zap className="w-6 h-6" />
            Zappy
          </div>
          <span className="font-mono bg-muted px-2 py-1 rounded text-sm">
            {roomCode || '------'}
          </span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 md:mb-12"
        >
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold gradient-text mb-2">
            🎉 Game Over!
          </h1>
          <p className="text-muted-foreground text-lg">
            Here are the final results
          </p>
        </motion.div>

        {/* Podium */}
        <div className="flex justify-center items-end gap-2 sm:gap-4 mb-8 md:mb-12 h-56 sm:h-64">
          {podiumOrder.map((index, position) => {
            const winner = winners[index];
            if (!winner) return null;

            const RankIcon = rankIcons[index];
            const delay = position * 0.2;

            return (
              <motion.div
                key={winner.rank}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay, type: 'spring', bounce: 0.4 }}
                className="flex flex-col items-center"
              >
                {/* Avatar */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: delay + 0.2, type: 'spring', bounce: 0.5 }}
                  className={`mb-2 ${index === 0 ? 'scale-125' : ''}`}
                >
                  <AnimatedAvatar
                    avatarId={winner.avatarId}
                    size={index === 0 ? 'lg' : 'md'}
                    rank={winner.rank}
                  />
                </motion.div>

                {/* Name & Score */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: delay + 0.3 }}
                  className="text-center mb-2"
                >
                  <p className="font-semibold">{winner.name}</p>
                  <p className="text-primary font-bold">{winner.score.toLocaleString()}</p>

                  {/* Show titles for winners */}
                  {titles.filter(t => t.participantId === winner.id).map(t => (
                    <TitleBadge key={t.titleType} titleType={t.titleType} size="sm" />
                  ))}
                </motion.div>

                {/* Podium */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  transition={{ delay: delay + 0.1, duration: 0.5 }}
                  className={`w-20 sm:w-24 md:w-32 ${podiumHeights[index]} rounded-t-xl bg-gradient-to-t from-primary/30 to-primary/10 border border-primary/20 flex items-start justify-center pt-3`}
                >
                  <RankIcon className={`w-6 h-6 sm:w-8 sm:h-8 ${rankColors[index]}`} />
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Full Leaderboard with streaks */}
        <div className="max-w-2xl mx-auto mb-8">
          <h2 className="font-display text-xl font-bold mb-4 text-center">
            Final Standings
          </h2>

          {(gameMode === 'team' || gameMode === 'coop') && teams.length > 0 ? (
            <TeamFinalLeaderboard
              teams={teams}
              currentParticipantId={currentParticipant?.id}
              currentTeamId={currentParticipant?.teamId}
            />
          ) : (
            <EnhancedLeaderboard
              entries={allPlayers.map(p => ({
                id: p.id,
                name: p.name,
                score: p.score,
                rank: p.rank,
                avatarId: p.avatarId,
                maxStreak: p.maxStreak,
                titles: titles.filter(t => t.participantId === p.id).map(t => t.titleType),
              }))}
              showStreaks
              showTitles
              highestStreakHolder={highestStreakHolder || undefined}
              currentUserId={currentParticipant?.id}
            />
          )}
        </div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex flex-wrap justify-center gap-4 mt-12"
        >
          <Button variant="outline" size="lg" onClick={() => navigate('/dashboard')}>
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
          <Button size="lg" className="neon-glow" onClick={() => navigate('/join')}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Play Again
          </Button>
          <Button variant="outline" size="lg" onClick={() => setShowShareModal(true)}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </motion.div>
      </main>

      {/* Share Modal */}
      {(() => {
        const isHost = user?.id === hostId;
        const hasParticipant = !!currentParticipant;
        const cardType = hasParticipant ? 'player' : 'host';
        return (
          <ShareModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            type={cardType}
            data={{
              quizTitle: 'Live Quiz', // Ideally fetched from DB
              // Host Data
              hostName: user?.email?.split('@')[0] || 'Host',
              winners: winners.map(w => ({ name: w.name, avatarId: w.avatarId, score: w.score })),
              // Player Data
              playerName: currentParticipant?.name || 'Player',
              avatarId: currentParticipant?.avatarId,
              score: currentParticipant?.score,
              rank: currentParticipant?.rank,
              titles: titles.filter(t => t.participantId === currentParticipant?.id).map(t => t.titleType),
              // Common
              totalPlayers: allPlayers.length
            }}
          />
        );
      })()}
    </div>
  );
}