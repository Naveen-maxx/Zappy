import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { SpriteAvatar } from './SpriteAvatar';
import { TitleReveal, TitleBadge, TITLE_CONFIGS, TitleType } from './PlayerTitles';
import { Zap, Trophy, Star, Award, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Winner {
  id: string;
  name: string;
  score: number;
  avatarId: number;
  rank: number;
}

interface PlayerTitle {
  participantId: string;
  titleType: TitleType;
  playerName: string;
}

interface EndGameCelebrationProps {
  winners: Winner[];
  allPlayers: Winner[];
  titles: PlayerTitle[];
  onComplete: () => void;
}

export function EndGameCelebration({ 
  winners, 
  allPlayers, 
  titles, 
  onComplete 
}: EndGameCelebrationProps) {
  const [phase, setPhase] = useState<'intro' | 'podium' | 'awards' | 'spotlight'>('intro');
  const [visibleAwards, setVisibleAwards] = useState(0);
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  // Random spotlight awards
  const spotlightAwards = [
    { label: 'Party Starter', emoji: '🎉' },
    { label: 'Quick Thinker', emoji: '💡' },
    { label: 'Fearless Player', emoji: '🦁' },
    { label: 'Rising Star', emoji: '⭐' },
  ];

  // Confetti effects
  useEffect(() => {
    if (phase === 'intro') {
      // Initial burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B'],
      });
    }

    if (phase === 'podium') {
      // Continuous celebration
      const interval = setInterval(() => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFD700', '#FFA500', '#FF6347'],
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFD700', '#FFA500', '#FF6347'],
        });
      }, 200);

      return () => clearInterval(interval);
    }
  }, [phase]);

  // Phase progression
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Intro → Podium
    timers.push(setTimeout(() => setPhase('podium'), 2000));

    // Podium → Awards
    timers.push(setTimeout(() => setPhase('awards'), 6000));

    // Reveal awards one by one
    if (titles.length > 0) {
      titles.forEach((_, i) => {
        timers.push(setTimeout(() => setVisibleAwards(i + 1), 7000 + i * 1500));
      });
    }

    // Awards → Spotlight
    const awardsTime = 7000 + titles.length * 1500 + 2000;
    timers.push(setTimeout(() => setPhase('spotlight'), awardsTime));

    // Spotlight progression
    spotlightAwards.forEach((_, i) => {
      timers.push(setTimeout(() => setSpotlightIndex(i + 1), awardsTime + 1000 + i * 2000));
    });

    return () => timers.forEach(clearTimeout);
  }, [titles.length]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg overflow-y-auto">
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {/* INTRO PHASE */}
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-4" />
              </motion.div>
              <h1 className="font-display text-5xl md:text-7xl font-bold gradient-text">
                Game Over!
              </h1>
            </motion.div>
          )}

          {/* PODIUM PHASE */}
          {phase === 'podium' && (
            <motion.div
              key="podium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-2xl"
            >
              <motion.h2
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center font-display text-3xl font-bold mb-8"
              >
                🏆 Champions 🏆
              </motion.h2>

              {/* Podium */}
              <div className="flex justify-center items-end gap-4 h-80">
                {[1, 0, 2].map((winnerIndex, position) => {
                  const winner = winners[winnerIndex];
                  if (!winner) return <div key={position} className="w-28" />;

                  const heights = ['h-48', 'h-40', 'h-32'];
                  const delays = [0.3, 0.1, 0.5];

                  return (
                    <motion.div
                      key={winner.id}
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: delays[position], type: 'spring', bounce: 0.4 }}
                      className="flex flex-col items-center"
                    >
                      {/* Avatar */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: delays[position] + 0.2, type: 'spring', bounce: 0.5 }}
                        className={cn(winnerIndex === 0 && 'scale-125')}
                      >
                        <SpriteAvatar
                          avatarId={winner.avatarId}
                          name={winner.name}
                          size={winnerIndex === 0 ? 'xl' : 'lg'}
                          rank={winner.rank}
                          isActive
                        />
                      </motion.div>

                      {/* Score */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: delays[position] + 0.4 }}
                        className="text-primary font-bold text-lg mt-2"
                      >
                        {winner.score.toLocaleString()}
                      </motion.div>

                      {/* Podium block */}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        transition={{ delay: delays[position], duration: 0.5 }}
                        className={cn(
                          'w-24 md:w-32 rounded-t-xl bg-gradient-to-t from-primary/40 to-primary/20 border border-primary/30 flex items-start justify-center pt-3 mt-2',
                          heights[winnerIndex]
                        )}
                      >
                        <span className="text-3xl">
                          {winnerIndex === 0 ? '🥇' : winnerIndex === 1 ? '🥈' : '🥉'}
                        </span>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* AWARDS PHASE */}
          {phase === 'awards' && titles.length > 0 && (
            <motion.div
              key="awards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-4xl"
            >
              <motion.h2
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center font-display text-3xl font-bold mb-8"
              >
                <Sparkles className="inline w-8 h-8 text-yellow-400 mr-2" />
                Special Awards
                <Sparkles className="inline w-8 h-8 text-yellow-400 ml-2" />
              </motion.h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {titles.slice(0, visibleAwards).map((title, index) => (
                  <TitleReveal
                    key={title.titleType}
                    playerName={title.playerName}
                    titleType={title.titleType}
                    delay={0}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* SPOTLIGHT PHASE */}
          {phase === 'spotlight' && (
            <motion.div
              key="spotlight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-3xl"
            >
              <motion.h2
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center font-display text-3xl font-bold mb-8"
              >
                🌟 Spotlight Awards 🌟
              </motion.h2>

              <div className="grid grid-cols-2 gap-4">
                {spotlightAwards.slice(0, spotlightIndex).map((award, index) => {
                  // Pick random player for spotlight
                  const randomPlayer = allPlayers[index % allPlayers.length];
                  if (!randomPlayer) return null;

                  return (
                    <motion.div
                      key={award.label}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="glass-card p-4 rounded-xl text-center"
                    >
                      <span className="text-4xl mb-2 block">{award.emoji}</span>
                      <p className="font-bold text-primary">{award.label}</p>
                      <p className="text-sm text-muted-foreground">{randomPlayer.name}</p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Continue button */}
              {spotlightIndex >= spotlightAwards.length && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-center mt-8"
                >
                  <button
                    onClick={onComplete}
                    className="px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full transition-colors neon-glow"
                  >
                    View Full Results
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
