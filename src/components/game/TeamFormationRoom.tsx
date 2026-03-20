import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Users, Crown, Check, Play, UserPlus, Info, PenLine } from 'lucide-react';
import { AnimatedAvatar } from './AnimatedAvatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Team {
    id: string;
    name: string;
    color: string;
    max_members: number;
    leader_id: string | null;
}

interface Participant {
    id: string;
    name: string;
    avatar_id: number;
    team_id: string | null;
}

interface TeamFormationRoomProps {
    roomId: string;
    isHost: boolean;
    gameMode: 'team' | 'coop';
    myParticipantId?: string | null;
    onStartGame?: () => void;
}

export function TeamFormationRoom({
    roomId,
    isHost,
    gameMode,
    myParticipantId,
    onStartGame,
}: TeamFormationRoomProps) {
    const [teams, setTeams] = useState<Team[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [isJoining, setIsJoining] = useState(false);
    const [isNamingModalOpen, setIsNamingModalOpen] = useState(false);
    const [teamToRename, setTeamToRename] = useState<Team | null>(null);
    const [newTeamName, setNewTeamName] = useState('');
    const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);

    useEffect(() => {
        if (!roomId) return;

        const fetchData = async () => {
            // Fetch teams
            const { data: teamsData } = await supabase
                .from('teams')
                .select('*')
                .eq('room_id', roomId)
                .order('created_at', { ascending: true });

            if (teamsData) setTeams(teamsData as unknown as Team[]);

            // Fetch participants
            const { data: participantsData } = await supabase
                .from('room_participants')
                .select('id, name, avatar_id, team_id')
                .eq('room_id', roomId);

            if (participantsData) setParticipants(participantsData);
        };

        fetchData();

        // Subscribe to changes
        const teamsChannel = supabase
            .channel(`teams_${roomId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `room_id=eq.${roomId}` }, fetchData)
            .subscribe();

        const participantsChannel = supabase
            .channel(`participants_${roomId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${roomId}` }, fetchData)
            .subscribe();

        return () => {
            supabase.removeChannel(teamsChannel);
            supabase.removeChannel(participantsChannel);
        };
    }, [roomId]);

    const handleJoinTeam = async (teamId: string) => {
        if (isHost && selectedParticipantId) {
            handleMoveOrSwap(teamId, null);
            return;
        }
        if (!myParticipantId || isJoining) return;

        setIsJoining(true);
        try {
            const { data: success, error } = await (supabase.rpc as any)('join_team_slot', {
                p_team_id: teamId,
                p_participant_id: myParticipantId,
            });

            if (error) throw error;
            if (!success) {
                toast.error('This team is full!');
            } else {
                toast.success('Joined team!');
            }
        } catch (error: any) {
            console.error('Error joining team:', error);
            toast.error('Failed to join team');
        } finally {
            setIsJoining(false);
        }
    };

    const handleRenameTeam = async () => {
        if (!teamToRename || !newTeamName.trim() || !myParticipantId) return;

        try {
            const { data: success, error } = await (supabase.rpc as any)('rename_team', {
                p_team_id: teamToRename.id,
                p_participant_id: myParticipantId,
                p_new_name: newTeamName.trim(),
            });

            if (error) throw error;
            if (!success) {
                throw new Error('Permission denied: You cannot rename this team.');
            }

            // Optimistic update: instantly update the local state for the leader
            setTeams(prev => prev.map(t =>
                t.id === teamToRename.id ? { ...t, name: newTeamName.trim() } : t
            ));

            toast.success('Team renamed!');
            setIsNamingModalOpen(false);
        } catch (error) {
            console.error('Error renaming team:', error);
            toast.error('Failed to rename team');
        }
    };

    const handleMoveOrSwap = async (targetTeamId: string, targetParticipantId: string | null) => {
        if (!selectedParticipantId) return;

        setIsJoining(true);
        try {
            let success = false;
            let error = null;

            if (targetParticipantId) {
                // Swap
                const { data, error: swapError } = await (supabase.rpc as any)('swap_participants_between_teams', {
                    p_participant_a_id: selectedParticipantId,
                    p_participant_b_id: targetParticipantId,
                });
                success = data;
                error = swapError;
            } else {
                // Move to empty slot
                const { data, error: moveError } = await (supabase.rpc as any)('move_participant_to_team', {
                    p_participant_id: selectedParticipantId,
                    p_target_team_id: targetTeamId,
                });
                success = data;
                error = moveError;
            }

            if (error) throw error;
            if (success) {
                toast.success(targetParticipantId ? 'Players swapped!' : 'Player moved!');
                setSelectedParticipantId(null);
            } else {
                toast.error('Operation failed');
            }
        } catch (error: any) {
            console.error('Moderation error:', error);
            toast.error('Failed to perform moderation action');
        } finally {
            setIsJoining(false);
        }
    };

    const getColorClass = (color: string) => {
        const colors: Record<string, string> = {
            red: 'bg-red-500 border-red-500 text-red-500',
            blue: 'bg-blue-500 border-blue-500 text-blue-500',
            green: 'bg-green-500 border-green-500 text-green-500',
            yellow: 'bg-yellow-500 border-yellow-500 text-yellow-500',
            purple: 'bg-purple-500 border-purple-500 text-purple-500',
            orange: 'bg-orange-500 border-orange-500 text-orange-500',
            pink: 'bg-pink-500 border-pink-500 text-pink-500',
            cyan: 'bg-cyan-500 border-cyan-500 text-cyan-500',
        };
        return colors[color] || 'bg-primary border-primary text-primary';
    };

    const unassignedParticipants = participants.filter(p => !p.team_id);

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8 p-4">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-display font-bold gradient-text">Choose Your Team</h2>
                <p className="text-muted-foreground">Pick a slot in the team you want to join!</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {teams.map((team) => {
                        const teamMembers = participants.filter(p => p.team_id === team.id);
                        const colorParts = getColorClass(team.color).split(' ');
                        const bgColor = colorParts[0];
                        const borderColor = colorParts[1];
                        const textColor = colorParts[2];
                        const isMyTeam = teamMembers.some(p => p.id === myParticipantId);

                        return (
                            <motion.div
                                key={team.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={cn(
                                    "glass-card rounded-2xl p-6 border-2 transition-all relative overflow-hidden",
                                    isMyTeam ? `${borderColor} shadow-lg shadow-${team.color}-500/20` : "border-transparent"
                                )}
                            >
                                {/* Team Header */}
                                <div className="flex items-center justify-between mb-4 sm:mb-6">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className={cn("w-3 h-3 sm:w-4 sm:h-4 rounded-full shadow-sm", bgColor)} />
                                        <h3 className="font-display font-bold text-lg sm:text-xl truncate">{team.name}</h3>
                                        {team.leader_id === myParticipantId && (
                                            <button
                                                onClick={() => {
                                                    setTeamToRename(team);
                                                    setNewTeamName(team.name);
                                                    setIsNamingModalOpen(true);
                                                }}
                                                className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-primary"
                                            >
                                                <PenLine className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="text-xs font-mono bg-muted px-2 py-1 rounded-full">
                                        {teamMembers.length} / {team.max_members}
                                    </div>
                                </div>

                                {/* Slots Grid */}
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 mb-6">
                                    {Array.from({ length: team.max_members }).map((_, i) => {
                                        const member = teamMembers[i];
                                        const isSelected = member && selectedParticipantId === member.id;
                                        return (
                                            <div key={i} className="flex flex-col items-center">
                                                {member ? (
                                                    <motion.button
                                                        whileHover={isHost ? { scale: 1.05 } : {}}
                                                        onClick={() => {
                                                            if (!isHost) return;
                                                            if (selectedParticipantId && selectedParticipantId !== member.id) {
                                                                handleMoveOrSwap(team.id, member.id);
                                                            } else {
                                                                setSelectedParticipantId(isSelected ? null : member.id);
                                                            }
                                                        }}
                                                        className={cn(
                                                            "relative rounded-full transition-all p-0.5",
                                                            isSelected ? "ring-4 ring-primary ring-offset-2 ring-offset-background scale-110 z-10" : ""
                                                        )}
                                                    >
                                                        <AnimatedAvatar avatarId={member.avatar_id} size="sm" showName={false} />
                                                        {team.leader_id === member.id && (
                                                            <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5 shadow-sm">
                                                                <Crown className="w-2.5 h-2.5 text-yellow-900" />
                                                            </div>
                                                        )}
                                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold bg-background/80 px-1 rounded truncate max-w-[40px]">
                                                            {member.name}
                                                        </div>
                                                    </motion.button>
                                                ) : (
                                                    <motion.button
                                                        whileHover={(!isMyTeam || isHost) && teamMembers.length < team.max_members ? { scale: 1.1 } : {}}
                                                        whileTap={(!isMyTeam || isHost) && teamMembers.length < team.max_members ? { scale: 0.95 } : {}}
                                                        onClick={() => handleJoinTeam(team.id)}
                                                        disabled={(!isHost && (isJoining || isMyTeam)) || (teamMembers.length >= team.max_members && !selectedParticipantId)}
                                                        className={cn(
                                                            "w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center transition-colors",
                                                            (!isHost && (isMyTeam || teamMembers.length >= team.max_members))
                                                                ? "border-muted bg-muted/20 cursor-not-allowed"
                                                                : cn(
                                                                    "border-primary/30 hover:border-primary hover:bg-primary/10 text-primary/30 hover:text-primary",
                                                                    isHost && selectedParticipantId && "border-primary border-solid bg-primary/20 animate-pulse"
                                                                )
                                                        )}
                                                    >
                                                        <UserPlus className="w-4 h-4" />
                                                    </motion.button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Team Status / Footer */}
                                {isMyTeam && (
                                    <div className={cn("bg-muted/50 rounded-xl p-3 text-center text-sm font-medium flex items-center justify-center gap-2", textColor)}>
                                        <Check className="w-4 h-4" />
                                        You are in this team
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {unassignedParticipants.length > 0 && (
                <div className="glass-card p-6 rounded-2xl border-border/30">
                    <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-muted-foreground" />
                        Waiting to Join ({unassignedParticipants.length})
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {unassignedParticipants.map(participant => (
                            <div key={participant.id} className="flex items-center gap-2 bg-muted/30 px-3 py-2 rounded-xl">
                                <button
                                    onClick={() => isHost && setSelectedParticipantId(selectedParticipantId === participant.id ? null : participant.id)}
                                    className={cn(
                                        "flex items-center gap-2",
                                        isHost && "hover:opacity-80 transition-opacity",
                                        selectedParticipantId === participant.id && "ring-2 ring-primary rounded-lg px-1 shadow-sm"
                                    )}
                                >
                                    <AnimatedAvatar avatarId={participant.avatar_id} size="sm" showName={false} />
                                    <span className="text-sm font-medium">{participant.name}</span>
                                </button>
                                {participant.id === myParticipantId && <span className="text-[10px] font-bold text-primary">(You)</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isHost && (
                <div className="flex flex-col items-center gap-4 py-8">
                    <div className="flex items-center gap-2 text-muted-foreground bg-muted/20 px-4 py-2 rounded-full text-sm">
                        <Info className="w-4 h-4" />
                        {unassignedParticipants.length > 0
                            ? `Waiting for ${unassignedParticipants.length} more player${unassignedParticipants.length > 1 ? 's' : ''}...`
                            : "All players have joined a team!"
                        }
                    </div>
                    <Button
                        size="lg"
                        className="neon-glow h-16 px-12 text-xl font-display font-bold"
                        onClick={onStartGame}
                    >
                        <Play className="w-6 h-6 mr-2 fill-current" />
                        Start Instructions
                    </Button>
                </div>
            )}

            {/* Naming Modal */}
            <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm transition-opacity", isNamingModalOpen ? "opacity-100" : "opacity-0 pointer-events-none")}>
                <div className="glass-card w-full max-w-sm p-6 rounded-2xl shadow-2xl space-y-4">
                    <h3 className="text-xl font-display font-bold">Rename Your Team</h3>
                    <input
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="Enter team name..."
                        className="w-full bg-muted border-none rounded-xl px-4 py-3 focus:ring-2 ring-primary transition-all"
                    />
                    <div className="flex gap-3">
                        <Button variant="ghost" className="flex-1" onClick={() => setIsNamingModalOpen(false)}>Cancel</Button>
                        <Button className="flex-1" onClick={handleRenameTeam}>Save Name</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
