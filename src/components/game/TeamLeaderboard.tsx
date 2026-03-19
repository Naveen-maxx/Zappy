import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TeamMember {
  id: string;
  name: string;
  score: number;
  avatarId: number;
}

export interface TeamEntry {
  id: string;
  name: string;
  color: string;
  score: number;
  rank: number;
  members: TeamMember[];
}

interface TeamLeaderboardProps {
  teams: TeamEntry[];
  currentTeamId?: string;
  showMembers?: boolean;
  maxDisplay?: number;
  className?: string;
}

const teamColorClasses: Record<string, string> = {
  red: 'border-red-500/50 bg-red-500/10',
  blue: 'border-blue-500/50 bg-blue-500/10',
  green: 'border-green-500/50 bg-green-500/10',
  yellow: 'border-yellow-500/50 bg-yellow-500/10',
  purple: 'border-purple-500/50 bg-purple-500/10',
  orange: 'border-orange-500/50 bg-orange-500/10',
  pink: 'border-pink-500/50 bg-pink-500/10',
  cyan: 'border-cyan-500/50 bg-cyan-500/10',
};

const teamTextColors: Record<string, string> = {
  red: 'text-red-400',
  blue: 'text-blue-400',
  green: 'text-green-400',
  yellow: 'text-yellow-400',
  purple: 'text-purple-400',
  orange: 'text-orange-400',
  pink: 'text-pink-400',
  cyan: 'text-cyan-400',
};

export function TeamLeaderboard({
  teams,
  currentTeamId,
  showMembers = false,
  maxDisplay = 10,
  className,
}: TeamLeaderboardProps) {
  const [expandedTeams, setExpandedTeams] = React.useState<Set<string>>(new Set());

  const displayedTeams = teams.slice(0, maxDisplay);

  const toggleTeam = (teamId: string) => {
    setExpandedTeams(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teamId)) {
        newSet.delete(teamId);
      } else {
        newSet.add(teamId);
      }
      return newSet;
    });
  };

  return (
    <div className={cn('w-full', className)}>
      <motion.div layout className="space-y-2">
        {displayedTeams.map((team, index) => {
          const isCurrentTeam = team.id === currentTeamId;
          const isTop3 = team.rank <= 3;
          const isExpanded = expandedTeams.has(team.id);
          const colorClass = teamColorClasses[team.color] || teamColorClasses.blue;
          const textColor = teamTextColors[team.color] || teamTextColors.blue;

          return (
            <motion.div
              key={team.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="overflow-hidden rounded-xl"
            >
              {/* Team row */}
              <div
                className={cn(
                  'flex items-center gap-3 p-3 transition-all border-2',
                  colorClass,
                  isCurrentTeam && 'ring-2 ring-primary',
                  showMembers && 'cursor-pointer hover:bg-muted/50'
                )}
                onClick={() => showMembers && toggleTeam(team.id)}
              >
                {/* Rank */}
                <div className="w-8 flex justify-center">
                  {team.rank === 1 && (
                    <Trophy className="w-6 h-6 text-yellow-400" />
                  )}
                  {team.rank === 2 && (
                    <Medal className="w-6 h-6 text-gray-400" />
                  )}
                  {team.rank === 3 && (
                    <Award className="w-6 h-6 text-orange-400" />
                  )}
                  {team.rank > 3 && (
                    <span className="font-display font-bold text-muted-foreground">
                      {team.rank}
                    </span>
                  )}
                </div>

                {/* Team icon */}
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', colorClass)}>
                  <Users className={cn('w-5 h-5', textColor)} />
                </div>

                {/* Team name */}
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    'font-medium truncate block',
                    textColor,
                    isCurrentTeam && 'font-bold'
                  )}>
                    {team.name}
                    {isCurrentTeam && ' (Your Team)'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Score */}
                <motion.span
                  key={team.score}
                  initial={{ scale: 1.2, color: 'hsl(var(--success))' }}
                  animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
                  className="font-display font-bold text-lg"
                >
                  {team.score.toLocaleString()}
                </motion.span>

                {/* Expand toggle */}
                {showMembers && (
                  <div className="w-6">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>

              {/* Member list (expanded) */}
              {showMembers && isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-x-2 border-b-2 rounded-b-xl bg-muted/30"
                  style={{ borderColor: `var(--${team.color}-500)` }}
                >
                  {team.members
                    .sort((a, b) => b.score - a.score)
                    .map((member, memberIndex) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 px-4 py-2 border-b border-border/30 last:border-0"
                      >
                        <span className="w-6 text-center text-xs text-muted-foreground">
                          #{memberIndex + 1}
                        </span>
                        <span className="flex-1 text-sm truncate">{member.name}</span>
                        <span className="text-sm font-medium text-primary">
                          +{member.score.toLocaleString()}
                        </span>
                      </div>
                    ))}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

// Compact version for in-game display (team names only)
interface CompactTeamLeaderboardProps {
  teams: TeamEntry[];
  currentTeamId?: string;
}

export function CompactTeamLeaderboard({ teams, currentTeamId }: CompactTeamLeaderboardProps) {
  const top5 = teams.slice(0, 5);

  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="font-display font-bold text-lg mb-3 text-center flex items-center justify-center gap-2">
        <Users className="w-5 h-5" />
        Team Rankings
      </h3>
      <div className="space-y-2">
        {top5.map((team) => {
          const isCurrentTeam = team.id === currentTeamId;
          const textColor = teamTextColors[team.color] || teamTextColors.blue;
          
          return (
            <motion.div
              key={team.id}
              layout
              className={cn(
                'flex items-center gap-2 text-sm',
                isCurrentTeam && 'font-bold'
              )}
            >
              <span className="w-5 text-center">
                {team.rank === 1 ? '🥇' : team.rank === 2 ? '🥈' : team.rank === 3 ? '🥉' : team.rank}
              </span>
              <span className={cn('flex-1 truncate', textColor)}>{team.name}</span>
              <span className="font-bold">{team.score.toLocaleString()}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
