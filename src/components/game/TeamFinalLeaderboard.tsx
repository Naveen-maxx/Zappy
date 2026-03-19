import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, Users, Crown } from 'lucide-react';
import { SpriteAvatar } from './SpriteAvatar';
import { cn } from '@/lib/utils';
import type { TeamEntry, TeamMember } from './TeamLeaderboard';

interface TeamFinalLeaderboardProps {
  teams: TeamEntry[];
  currentTeamId?: string;
  currentParticipantId?: string;
  className?: string;
}

const teamColorClasses: Record<string, string> = {
  red: 'from-red-500/20 to-red-500/5 border-red-500/50',
  blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/50',
  green: 'from-green-500/20 to-green-500/5 border-green-500/50',
  yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/50',
  purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/50',
  orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/50',
  pink: 'from-pink-500/20 to-pink-500/5 border-pink-500/50',
  cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/50',
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

const podiumHeights = ['h-32', 'h-24', 'h-20'];
const podiumOrder = [1, 0, 2]; // Display order: 2nd, 1st, 3rd

export function TeamFinalLeaderboard({
  teams,
  currentTeamId,
  currentParticipantId,
  className,
}: TeamFinalLeaderboardProps) {
  const top3Teams = teams.slice(0, 3);
  const remainingTeams = teams.slice(3);

  return (
    <div className={cn('w-full', className)}>
      {/* Podium for top 3 teams */}
      <div className="flex justify-center items-end gap-4 mb-8 h-64">
        {podiumOrder.map((index, position) => {
          const team = top3Teams[index];
          if (!team) return null;

          const colorClass = teamColorClasses[team.color] || teamColorClasses.blue;
          const textColor = teamTextColors[team.color] || teamTextColors.blue;
          const RankIcon = index === 0 ? Trophy : index === 1 ? Medal : Award;
          const rankColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];
          const delay = position * 0.2;
          const isCurrentTeam = team.id === currentTeamId;

          return (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay, type: 'spring', bounce: 0.4 }}
              className={cn(
                'flex flex-col items-center',
                isCurrentTeam && 'ring-2 ring-primary rounded-xl p-2'
              )}
            >
              {/* Team icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: delay + 0.2, type: 'spring', bounce: 0.5 }}
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center border-2',
                  colorClass,
                  index === 0 && 'w-20 h-20'
                )}
              >
                <Users className={cn('w-8 h-8', textColor, index === 0 && 'w-10 h-10')} />
              </motion.div>

              {/* Team info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + 0.3 }}
                className="text-center my-2"
              >
                <p className={cn('font-semibold text-sm', textColor)}>{team.name}</p>
                <p className="text-primary font-bold text-lg">{team.score.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  {team.members.length} player{team.members.length !== 1 ? 's' : ''}
                </p>
              </motion.div>

              {/* Podium */}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                transition={{ delay: delay + 0.1, duration: 0.5 }}
                className={cn(
                  'w-24 md:w-28 rounded-t-xl bg-gradient-to-t border-2 flex items-start justify-center pt-2',
                  podiumHeights[index],
                  colorClass
                )}
              >
                <RankIcon className={cn('w-6 h-6', rankColors[index])} />
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Top 3 teams - expanded member view */}
      <div className="space-y-4 mb-6">
        {top3Teams.map((team, teamIndex) => {
          const colorClass = teamColorClasses[team.color] || teamColorClasses.blue;
          const textColor = teamTextColors[team.color] || teamTextColors.blue;
          const isCurrentTeam = team.id === currentTeamId;
          const sortedMembers = [...team.members].sort((a, b) => b.score - a.score);

          return (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + teamIndex * 0.1 }}
              className={cn(
                'rounded-xl border-2 overflow-hidden bg-gradient-to-b',
                colorClass,
                isCurrentTeam && 'ring-2 ring-primary'
              )}
            >
              {/* Team header */}
              <div className="flex items-center gap-3 p-3 border-b border-border/30">
                <div className="w-8 flex justify-center">
                  {team.rank === 1 && <Trophy className="w-5 h-5 text-yellow-400" />}
                  {team.rank === 2 && <Medal className="w-5 h-5 text-gray-400" />}
                  {team.rank === 3 && <Award className="w-5 h-5 text-orange-400" />}
                </div>
                <Users className={cn('w-5 h-5', textColor)} />
                <span className={cn('font-bold flex-1', textColor)}>
                  {team.name}
                  {isCurrentTeam && ' (Your Team)'}
                </span>
                <span className="font-display font-bold text-lg">
                  {team.score.toLocaleString()}
                </span>
              </div>

              {/* Member contributions */}
              <div className="divide-y divide-border/30">
                {sortedMembers.map((member, memberIndex) => {
                  const isCurrentPlayer = member.id === currentParticipantId;
                  const contribution = team.score > 0 
                    ? Math.round((member.score / team.score) * 100) 
                    : 0;

                  return (
                    <div
                      key={member.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2',
                        isCurrentPlayer && 'bg-primary/10'
                      )}
                    >
                      <span className="w-6 text-center text-xs text-muted-foreground">
                        #{memberIndex + 1}
                      </span>
                      <SpriteAvatar avatarId={member.avatarId} size="sm" showName={false} />
                      <span className={cn(
                        'flex-1 text-sm truncate',
                        isCurrentPlayer && 'text-primary font-bold'
                      )}>
                        {member.name}
                        {isCurrentPlayer && ' (You)'}
                      </span>
                      <div className="text-right">
                        <span className="text-sm font-medium text-primary block">
                          +{member.score.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {contribution}% contribution
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Remaining teams */}
      {remainingTeams.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="space-y-2"
        >
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Other Teams</h3>
          {remainingTeams.map((team, index) => {
            const textColor = teamTextColors[team.color] || teamTextColors.blue;
            const colorClass = teamColorClasses[team.color] || teamColorClasses.blue;
            const isCurrentTeam = team.id === currentTeamId;

            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + index * 0.05 }}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border',
                  colorClass,
                  isCurrentTeam && 'ring-2 ring-primary'
                )}
              >
                <span className="w-6 text-center font-bold text-muted-foreground">
                  #{team.rank}
                </span>
                <Users className={cn('w-5 h-5', textColor)} />
                <span className={cn('flex-1 font-medium truncate', textColor)}>
                  {team.name}
                </span>
                <span className="font-bold">{team.score.toLocaleString()}</span>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
