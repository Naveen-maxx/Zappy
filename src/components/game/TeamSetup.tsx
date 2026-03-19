import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Users, Shuffle, PenLine, Plus, Trash2,
  Crown, Palette
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TEAM_COLORS = [
  { name: 'Red', value: 'red', bg: 'bg-red-500', border: 'border-red-500' },
  { name: 'Blue', value: 'blue', bg: 'bg-blue-500', border: 'border-blue-500' },
  { name: 'Green', value: 'green', bg: 'bg-green-500', border: 'border-green-500' },
  { name: 'Yellow', value: 'yellow', bg: 'bg-yellow-500', border: 'border-yellow-500' },
  { name: 'Purple', value: 'purple', bg: 'bg-purple-500', border: 'border-purple-500' },
  { name: 'Orange', value: 'orange', bg: 'bg-orange-500', border: 'border-orange-500' },
  { name: 'Pink', value: 'pink', bg: 'bg-pink-500', border: 'border-pink-500' },
  { name: 'Cyan', value: 'cyan', bg: 'bg-cyan-500', border: 'border-cyan-500' },
];

interface Team {
  id?: string;
  name: string;
  color: string;
  members: Array<{ id: string; name: string }>;
  leaderId?: string;
}

interface Participant {
  id: string;
  name: string;
  avatarId: number;
}

interface TeamSetupProps {
  roomId: string;
  participants: Participant[];
  gameMode: 'team' | 'coop';
  onTeamsCreated: () => void;
}

export function TeamSetup({ roomId, participants, gameMode, onTeamsCreated }: TeamSetupProps) {
  const [teams, setTeams] = useState<Team[]>([
    { name: 'Team Red', color: 'red', members: [] },
    { name: 'Team Blue', color: 'blue', members: [] },
  ]);
  const [teamSize, setTeamSize] = useState(4);
  const [assignmentMode, setAssignmentMode] = useState<'auto' | 'manual'>('auto');
  const [isCreating, setIsCreating] = useState(false);

  const unassignedParticipants = participants.filter(
    p => !teams.some(t => t.members.some(m => m.id === p.id))
  );

  const addTeam = () => {
    const usedColors = teams.map(t => t.color);
    const availableColor = TEAM_COLORS.find(c => !usedColors.includes(c.value))?.value || 'gray';

    setTeams([...teams, {
      name: `Team ${teams.length + 1}`,
      color: availableColor,
      members: [],
    }]);
  };

  const removeTeam = (index: number) => {
    if (teams.length <= 2) {
      toast.error('Minimum 2 teams required');
      return;
    }
    setTeams(teams.filter((_, i) => i !== index));
  };

  const updateTeamName = (index: number, name: string) => {
    const newTeams = [...teams];
    newTeams[index].name = name;
    setTeams(newTeams);
  };

  const updateTeamColor = (index: number, color: string) => {
    const newTeams = [...teams];
    newTeams[index].color = color;
    setTeams(newTeams);
  };

  const autoAssignTeams = () => {
    const shuffled = [...participants].sort(() => Math.random() - 0.5);

    // Calculate number of teams based on teamSize
    // Ensure at least 2 teams
    const numTeams = Math.max(2, Math.ceil(participants.length / teamSize));

    // Create configured teams
    const newTeams: Team[] = [];
    const usedColors = new Set<string>();

    for (let i = 0; i < numTeams; i++) {
      // Pick a unique color if possible
      let color = TEAM_COLORS[i % TEAM_COLORS.length].value;
      if (numTeams > TEAM_COLORS.length) {
        // Cycle through colors if we have more teams than colors
        color = TEAM_COLORS[i % TEAM_COLORS.length].value;
      }

      newTeams.push({
        name: `Team ${getColorConfig(color).name}`,
        color,
        members: []
      });
    }

    shuffled.forEach((p, i) => {
      const teamIndex = i % newTeams.length;
      newTeams[teamIndex].members.push({ id: p.id, name: p.name });
    });

    // Auto-assign leaders (first member of each team)
    newTeams.forEach(t => {
      if (t.members.length > 0) {
        t.leaderId = t.members[0].id;
      }
    });

    setTeams(newTeams);
    toast.success('Teams assigned randomly!');
  };

  const assignToTeam = (participantId: string, teamIndex: number) => {
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;

    const newTeams = teams.map((t, i) => {
      // Remove from all teams first
      const filtered = t.members.filter(m => m.id !== participantId);

      // Add to target team
      if (i === teamIndex) {
        return { ...t, members: [...filtered, { id: participant.id, name: participant.name }] };
      }
      return { ...t, members: filtered };
    });

    setTeams(newTeams);
  };

  const setTeamLeader = (teamIndex: number, participantId: string) => {
    const newTeams = [...teams];
    newTeams[teamIndex].leaderId = participantId;
    setTeams(newTeams);
  };

  const createTeams = async () => {
    // Validate all participants are assigned
    if (unassignedParticipants.length > 0) {
      toast.error('Please assign all players to teams');
      return;
    }

    // Validate team leaders for co-op mode
    if (gameMode === 'coop' && teams.some(t => !t.leaderId)) {
      toast.error('Please assign a leader to each team');
      return;
    }

    setIsCreating(true);

    try {
      // Create teams in database
      for (const team of teams) {
        const { data: createdTeam, error: teamError } = await supabase
          .from('teams')
          .insert({
            room_id: roomId,
            name: team.name,
            color: team.color,
            leader_id: team.leaderId || null,
          })
          .select()
          .single();

        if (teamError) throw teamError;

        // Update participants with team_id
        for (const member of team.members) {
          await supabase
            .from('room_participants')
            .update({ team_id: createdTeam.id })
            .eq('id', member.id);
        }
      }

      toast.success('Teams created successfully!');
      onTeamsCreated();
    } catch (error) {
      console.error('Error creating teams:', error);
      toast.error('Failed to create teams');
    } finally {
      setIsCreating(false);
    }
  };

  const getColorConfig = (color: string) =>
    TEAM_COLORS.find(c => c.value === color) || TEAM_COLORS[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-2xl mx-auto"
    >
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold mb-2">
          {gameMode === 'team' ? '👥 Team Setup' : '🤝 Co-op Team Setup'}
        </h2>
        <p className="text-muted-foreground">
          {gameMode === 'coop'
            ? 'Create teams and assign leaders for discussion mode'
            : 'Divide players into teams for competition'
          }
        </p>
      </div>

      {/* Team Size Slider - Only show for auto assignment */}
      {assignmentMode === 'auto' && (
        <div className="bg-card/30 p-4 rounded-xl border border-border/50">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <Label className="font-semibold">Target Team Size</Label>
            </div>
            <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded">
              {teamSize} players
            </span>
          </div>
          <Slider
            value={[teamSize]}
            onValueChange={(vals) => {
              setTeamSize(vals[0]);
              // Re-run auto assign if we change the size
              // autoAssignTeams(); // Optional: could auto-trigger or let user click button
            }}
            min={2}
            max={Math.max(8, participants.length)}
            step={1}
            className="mb-2"
          />
          <p className="text-xs text-muted-foreground text-center">
            Approx. {Math.ceil(participants.length / teamSize)} teams will be created
          </p>
        </div>
      )}

      {/* Assignment Mode Toggle */}
      <div className="flex justify-center gap-2">
        <Button
          variant={assignmentMode === 'auto' ? 'default' : 'outline'}
          onClick={() => setAssignmentMode('auto')}
        >
          <Shuffle className="w-4 h-4 mr-2" />
          Auto Assign
        </Button>
        <Button
          variant={assignmentMode === 'manual' ? 'default' : 'outline'}
          onClick={() => setAssignmentMode('manual')}
        >
          <PenLine className="w-4 h-4 mr-2" />
          Manual
        </Button>
      </div>

      {/* Auto-assign button */}
      {assignmentMode === 'auto' && (
        <div className="text-center">
          <Button onClick={autoAssignTeams} size="lg">
            <Shuffle className="w-4 h-4 mr-2" />
            Shuffle & Assign Teams
          </Button>
        </div>
      )}

      {/* Teams list */}
      <div className="space-y-4">
        {teams.map((team, index) => {
          const colorConfig = getColorConfig(team.color);

          return (
            <motion.div
              key={index}
              layout
              className={cn(
                'p-4 rounded-xl border-2 bg-card/50',
                colorConfig.border
              )}
            >
              {/* Team header */}
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('w-4 h-4 rounded-full', colorConfig.bg)} />
                <Input
                  value={team.name}
                  onChange={(e) => updateTeamName(index, e.target.value)}
                  className="font-bold flex-1"
                />
                <select
                  value={team.color}
                  onChange={(e) => updateTeamColor(index, e.target.value)}
                  className="bg-muted rounded px-2 py-1 text-sm"
                >
                  {TEAM_COLORS.map(c => (
                    <option key={c.value} value={c.value}>{c.name}</option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTeam(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Team members */}
              <div className="space-y-1 mb-3">
                {team.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No members yet
                  </p>
                ) : (
                  team.members.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                    >
                      <span className="text-sm">{member.name}</span>
                      {gameMode === 'coop' && (
                        <Button
                          variant={team.leaderId === member.id ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setTeamLeader(index, member.id)}
                        >
                          <Crown className={cn(
                            'w-4 h-4',
                            team.leaderId === member.id && 'text-yellow-400'
                          )} />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add member dropdown (manual mode) */}
              {assignmentMode === 'manual' && unassignedParticipants.length > 0 && (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      assignToTeam(e.target.value, index);
                      e.target.value = '';
                    }
                  }}
                  className="w-full bg-muted rounded px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="">+ Add player...</option>
                  {unassignedParticipants.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </motion.div>
          );
        })}

        {/* Add team button */}
        <Button
          variant="outline"
          onClick={addTeam}
          className="w-full"
          disabled={teams.length >= 8}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Team
        </Button>
      </div>

      {/* Unassigned players (manual mode) */}
      {assignmentMode === 'manual' && unassignedParticipants.length > 0 && (
        <div className="p-4 bg-muted/30 rounded-xl">
          <h3 className="font-bold text-sm mb-2 text-muted-foreground">
            Unassigned Players ({unassignedParticipants.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {unassignedParticipants.map(p => (
              <span key={p.id} className="px-2 py-1 bg-muted rounded text-sm">
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Create button */}
      <Button
        onClick={createTeams}
        disabled={isCreating || unassignedParticipants.length > 0}
        size="lg"
        className="w-full neon-glow"
      >
        {isCreating ? 'Creating...' : 'Create Teams & Start Game'}
      </Button>
    </motion.div>
  );
}
