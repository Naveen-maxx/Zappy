import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedAvatar } from './AnimatedAvatar';
import { Trophy, Medal, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LeaderboardEntry } from '@/types/game';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  maxDisplay?: number;
  currentUserId?: string;
  showTop3Highlight?: boolean;
  className?: string;
}

export function Leaderboard({
  entries,
  maxDisplay = 5,
  currentUserId,
  showTop3Highlight = true,
  className,
}: LeaderboardProps) {
  const displayedEntries = entries.slice(0, maxDisplay);

  return (
    <div className={cn('w-full', className)}>
      <motion.div layout className="space-y-2">
        {displayedEntries.map((entry, index) => {
          const isCurrentUser = entry.id === currentUserId;
          const isTop3 = entry.rank <= 3;

          return (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl transition-all',
                isCurrentUser
                  ? 'bg-primary/20 border-2 border-primary'
                  : 'bg-card/50',
                showTop3Highlight && isTop3 && !isCurrentUser && 'border border-border'
              )}
            >
              {/* Rank */}
              <div className="w-8 flex justify-center">
                {entry.rank === 1 && (
                  <Trophy className="w-6 h-6 text-yellow-400" />
                )}
                {entry.rank === 2 && (
                  <Medal className="w-6 h-6 text-gray-400" />
                )}
                {entry.rank === 3 && (
                  <Award className="w-6 h-6 text-orange-400" />
                )}
                {entry.rank > 3 && (
                  <span className="font-display font-bold text-muted-foreground">
                    {entry.rank}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <AnimatedAvatar
                avatarId={entry.avatarId}
                size="sm"
                showName={false}
              />

              {/* Name */}
              <span className={cn(
                'flex-1 font-medium truncate',
                isCurrentUser && 'text-primary font-bold'
              )}>
                {entry.name}
                {isCurrentUser && ' (You)'}
              </span>

              {/* Score */}
              <motion.span
                key={entry.score}
                initial={{ scale: 1.2, color: 'hsl(var(--success))' }}
                animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
                className="font-display font-bold text-lg"
              >
                {entry.score.toLocaleString()}
              </motion.span>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

// Compact leaderboard for in-game display
interface CompactLeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

export function CompactLeaderboard({ entries, currentUserId }: CompactLeaderboardProps) {
  const top5 = entries.slice(0, 5);

  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="font-display font-bold text-lg mb-3 text-center">
        🏆 Top 5
      </h3>
      <div className="space-y-2">
        {top5.map((entry, index) => {
          const isCurrentUser = entry.id === currentUserId;
          return (
            <motion.div
              key={entry.id}
              layout
              className={cn(
                'flex items-center gap-2 text-sm',
                isCurrentUser && 'text-primary font-bold'
              )}
            >
              <span className="w-5 text-center">
                {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
              </span>
              <span className="flex-1 truncate">{entry.name}</span>
              <span className="font-bold">{entry.score}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
