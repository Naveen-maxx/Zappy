import React from 'react';
import { motion } from 'framer-motion';
import { SpriteAvatar } from './SpriteAvatar';
import { TitleBadge, StreakIndicator, TitleType } from './PlayerTitles';
import { Trophy, Medal, Award, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  avatarId: number;
  rank: number;
  currentStreak?: number;
  maxStreak?: number;
  titles?: TitleType[];
}

interface EnhancedLeaderboardProps {
  entries: LeaderboardEntry[];
  maxDisplay?: number;
  currentUserId?: string;
  showStreaks?: boolean;
  showTitles?: boolean;
  highestStreakHolder?: string;
  className?: string;
}

export function EnhancedLeaderboard({
  entries,
  maxDisplay = 10,
  currentUserId,
  showStreaks = true,
  showTitles = true,
  highestStreakHolder,
  className,
}: EnhancedLeaderboardProps) {
  const displayedEntries = entries.slice(0, maxDisplay);

  // Find highest streak for highlighting
  const maxStreak = Math.max(...entries.map(e => e.maxStreak || 0));

  return (
    <div className={cn('w-full', className)}>
      <motion.div layout className="space-y-2">
        {displayedEntries.map((entry, index) => {
          const isCurrentUser = entry.id === currentUserId;
          const isTop3 = entry.rank <= 3;
          const hasHighestStreak = entry.id === highestStreakHolder;

          return (
            <motion.div
              key={entry.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl transition-all',
                isCurrentUser
                  ? 'bg-primary/20 border-2 border-primary'
                  : 'bg-card/50',
                isTop3 && !isCurrentUser && 'border border-border',
                hasHighestStreak && 'ring-2 ring-orange-400/50'
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
              <SpriteAvatar
                avatarId={entry.avatarId}
                size="sm"
                showName={false}
              />

              {/* Name and titles */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'font-medium truncate',
                    isCurrentUser && 'text-primary font-bold'
                  )}>
                    {entry.name}
                    {isCurrentUser && <span className="text-primary font-bold"> (You)</span>}
                  </span>

                  {/* Streak indicator */}
                  {showStreaks && entry.maxStreak && entry.maxStreak >= 2 && (
                    <StreakIndicator
                      streak={entry.maxStreak}
                      isHighest={hasHighestStreak}
                    />
                  )}
                </div>

                {/* Titles */}
                {showTitles && entry.titles && entry.titles.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {entry.titles.slice(0, 2).map((title) => (
                      <TitleBadge
                        key={title}
                        titleType={title}
                        size="sm"
                        showLabel={false}
                      />
                    ))}
                  </div>
                )}
              </div>

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

      {/* Highest Streak Holder footer */}
      {highestStreakHolder && maxStreak >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 p-3 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl border border-orange-500/30"
        >
          <div className="flex items-center justify-center gap-2">
            <Flame className="w-5 h-5 text-orange-400 animate-pulse" />
            <span className="font-bold text-orange-400">
              🔥 Highest Streak: {maxStreak}
            </span>
            <span className="text-muted-foreground">
              - {entries.find(e => e.id === highestStreakHolder)?.name}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Compact version for in-game display
interface CompactEnhancedLeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  highestStreakHolder?: string;
}

export function CompactEnhancedLeaderboard({
  entries,
  currentUserId,
  highestStreakHolder
}: CompactEnhancedLeaderboardProps) {
  const top5 = entries.slice(0, 5);
  const maxStreak = Math.max(...entries.map(e => e.maxStreak || 0));

  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="font-display font-bold text-lg mb-3 text-center">
        🏆 Top 5
      </h3>
      <div className="space-y-2">
        {top5.map((entry) => {
          const isCurrentUser = entry.id === currentUserId;
          const hasHighestStreak = entry.id === highestStreakHolder;

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
              {hasHighestStreak && <Flame className="w-4 h-4 text-orange-400" />}
              <span className="font-bold">{entry.score}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Streak holder */}
      {highestStreakHolder && maxStreak >= 3 && (
        <div className="mt-3 pt-3 border-t border-border/50 text-center text-xs text-muted-foreground">
          <Flame className="w-3 h-3 inline text-orange-400" />
          {' '}Streak Leader: {entries.find(e => e.id === highestStreakHolder)?.name} ({maxStreak})
        </div>
      )}
    </div>
  );
}
