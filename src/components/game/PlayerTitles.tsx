import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Zap, Target, TrendingUp, Flame, Crown, Star, 
  Award, Timer, Brain, Sparkles
} from 'lucide-react';

// Title definitions
export const TITLE_CONFIGS = {
  speed_demon: {
    name: 'Speed Demon',
    icon: Zap,
    description: 'Lowest average response time',
    color: 'from-yellow-400 to-orange-500',
    textColor: 'text-yellow-400',
    emoji: '⚡',
  },
  accuracy_king: {
    name: 'Accuracy King',
    icon: Target,
    description: '100% correct answers',
    color: 'from-emerald-400 to-green-500',
    textColor: 'text-emerald-400',
    emoji: '🎯',
  },
  comeback_champ: {
    name: 'Comeback Champ',
    icon: TrendingUp,
    description: 'Rose from bottom to Top 3',
    color: 'from-blue-400 to-cyan-500',
    textColor: 'text-blue-400',
    emoji: '🚀',
  },
  streak_master: {
    name: 'Streak Master',
    icon: Flame,
    description: 'Highest answer streak',
    color: 'from-red-400 to-orange-500',
    textColor: 'text-red-400',
    emoji: '🔥',
  },
  most_improved: {
    name: 'Most Improved',
    icon: Star,
    description: 'Biggest score jump',
    color: 'from-purple-400 to-pink-500',
    textColor: 'text-purple-400',
    emoji: '⭐',
  },
  quiz_master: {
    name: 'Quiz Master',
    icon: Brain,
    description: 'Answered all questions',
    color: 'from-indigo-400 to-violet-500',
    textColor: 'text-indigo-400',
    emoji: '🧠',
  },
};

export type TitleType = keyof typeof TITLE_CONFIGS;

interface TitleBadgeProps {
  titleType: TitleType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function TitleBadge({ 
  titleType, 
  size = 'md', 
  showLabel = true,
  className 
}: TitleBadgeProps) {
  const config = TITLE_CONFIGS[titleType];
  if (!config) return null;

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <motion.div
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        'inline-flex items-center rounded-full font-bold',
        'bg-gradient-to-r shadow-lg',
        config.color,
        sizeClasses[size],
        className
      )}
    >
      <Icon className={cn(iconSizes[size], 'text-white')} />
      {showLabel && (
        <span className="text-white">{config.name}</span>
      )}
    </motion.div>
  );
}

// Animated title reveal for end-of-game
interface TitleRevealProps {
  playerName: string;
  titleType: TitleType;
  delay?: number;
}

export function TitleReveal({ playerName, titleType, delay = 0 }: TitleRevealProps) {
  const config = TITLE_CONFIGS[titleType];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', bounce: 0.4 }}
      className="flex flex-col items-center gap-3 p-6 glass-card rounded-2xl"
    >
      {/* Icon with glow */}
      <motion.div
        animate={{ 
          boxShadow: [
            '0 0 20px rgba(255,255,255,0.3)',
            '0 0 40px rgba(255,255,255,0.5)',
            '0 0 20px rgba(255,255,255,0.3)',
          ]
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className={cn(
          'w-16 h-16 rounded-full bg-gradient-to-br flex items-center justify-center',
          config.color
        )}
      >
        <Icon className="w-8 h-8 text-white" />
      </motion.div>

      {/* Title name */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-1">{config.emoji}</p>
        <h3 className={cn('font-display text-xl font-bold', config.textColor)}>
          {config.name}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
      </div>

      {/* Player name */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.3 }}
        className="font-bold text-foreground"
      >
        🏆 {playerName}
      </motion.div>
    </motion.div>
  );
}

// Streak indicator for leaderboard
interface StreakIndicatorProps {
  streak: number;
  isHighest?: boolean;
}

export function StreakIndicator({ streak, isHighest = false }: StreakIndicatorProps) {
  if (streak < 2) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold',
        isHighest 
          ? 'bg-gradient-to-r from-orange-400 to-red-500 text-white' 
          : 'bg-muted text-muted-foreground'
      )}
    >
      <Flame className={cn('w-3 h-3', isHighest && 'animate-pulse')} />
      <span>{streak}</span>
    </motion.div>
  );
}

// Calculate and assign titles based on game data
export function calculateTitles(participants: Array<{
  id: string;
  name: string;
  score: number;
  totalCorrect: number;
  totalAnswers: number;
  maxStreak: number;
  avgResponseTimeMs: number | null;
  rankHistory?: number[];
}>): Array<{ participantId: string; titleType: TitleType; playerName: string }> {
  const titles: Array<{ participantId: string; titleType: TitleType; playerName: string }> = [];

  if (participants.length === 0) return titles;

  // Speed Demon - lowest avg response time (must have answered at least 1)
  const withResponseTime = participants.filter(p => p.avgResponseTimeMs && p.avgResponseTimeMs > 0);
  if (withResponseTime.length > 0) {
    const speedDemon = withResponseTime.reduce((fastest, p) => 
      (p.avgResponseTimeMs! < fastest.avgResponseTimeMs!) ? p : fastest
    );
    titles.push({ participantId: speedDemon.id, titleType: 'speed_demon', playerName: speedDemon.name });
  }

  // Accuracy King - 100% correct answers (must have answered at least 1)
  const perfectPlayers = participants.filter(p => 
    p.totalAnswers > 0 && p.totalCorrect === p.totalAnswers
  );
  if (perfectPlayers.length > 0) {
    // Give to highest scorer among perfect players
    const accuracyKing = perfectPlayers.reduce((best, p) => p.score > best.score ? p : best);
    titles.push({ participantId: accuracyKing.id, titleType: 'accuracy_king', playerName: accuracyKing.name });
  }

  // Streak Master - highest max streak
  if (participants.some(p => p.maxStreak >= 3)) {
    const streakMaster = participants.reduce((best, p) => p.maxStreak > best.maxStreak ? p : best);
    titles.push({ participantId: streakMaster.id, titleType: 'streak_master', playerName: streakMaster.name });
  }

  // Comeback Champ - biggest rank improvement from mid-game
  const withHistory = participants.filter(p => p.rankHistory && p.rankHistory.length > 1);
  if (withHistory.length > 0) {
    let biggestComeback = { participant: withHistory[0], improvement: 0 };
    
    for (const p of withHistory) {
      if (!p.rankHistory) continue;
      const midRank = p.rankHistory[Math.floor(p.rankHistory.length / 2)];
      const finalRank = p.rankHistory[p.rankHistory.length - 1];
      const improvement = midRank - finalRank;
      
      if (improvement > biggestComeback.improvement && finalRank <= 3) {
        biggestComeback = { participant: p, improvement };
      }
    }

    if (biggestComeback.improvement >= 3) {
      titles.push({ 
        participantId: biggestComeback.participant.id, 
        titleType: 'comeback_champ', 
        playerName: biggestComeback.participant.name 
      });
    }
  }

  return titles;
}
