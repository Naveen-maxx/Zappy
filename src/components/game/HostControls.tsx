import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Lock, Unlock, UserX, Settings, ChevronDown, ChevronUp,
  Users, Gamepad2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

interface Participant {
  id: string;
  name: string;
  avatarId: number;
}

export interface HostControlsProps {
  roomId: string;
  isLocked: boolean;
  participants: Participant[];
  gameMode: 'classic' | 'team' | 'coop';
  onLockChange: (locked: boolean) => void;
  onGameModeChange: (mode: 'classic' | 'team' | 'coop') => void;
  onKickPlayer?: (id: string) => void;
}

export function HostControls({
  roomId,
  isLocked,
  participants,
  gameMode,
  onLockChange,
  onGameModeChange,
  onKickPlayer,
}: HostControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [kickingId, setKickingId] = useState<string | null>(null);

  const toggleLock = async () => {
    try {
      const newLockState = !isLocked;
      await supabase
        .from('game_rooms')
        .update({ is_locked: newLockState })
        .eq('id', roomId);
      
      onLockChange(newLockState);
      toast.success(newLockState ? 'Room locked' : 'Room unlocked');
    } catch (error) {
      toast.error('Failed to update room lock');
    }
  };

  const kickPlayer = async (participantId: string, name: string) => {
    setKickingId(participantId);
    try {
      await supabase
        .from('room_participants')
        .delete()
        .eq('id', participantId);
      
      toast.success(`${name} has been removed from the game`);
      onKickPlayer?.(participantId);
    } catch (error) {
      toast.error('Failed to remove player');
    } finally {
      setKickingId(null);
    }
  };

  const changeGameMode = async (mode: 'classic' | 'team' | 'coop') => {
    try {
      await supabase
        .from('game_rooms')
        .update({ game_mode: mode })
        .eq('id', roomId);
      
      onGameModeChange(mode);
      
      const modeName = mode === 'coop' ? 'Co-op' : mode === 'team' ? 'Team' : 'Classic';
      toast.success(`Game mode changed to ${modeName}`);
    } catch (error) {
      toast.error('Failed to change game mode');
    }
  };

  return (
    <motion.div
      layout
      className="glass-card rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
        aria-expanded={isExpanded}
        aria-controls="host-controls-content"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" aria-hidden="true" />
          <span className="font-display font-bold">Host Controls</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-5 h-5" aria-hidden="true" />
        )}
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id="host-controls-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border/50"
          >
            <div className="p-4 space-y-4">
              {/* Room Lock */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isLocked ? (
                    <Lock className="w-4 h-4 text-warning" aria-hidden="true" />
                  ) : (
                    <Unlock className="w-4 h-4 text-success" aria-hidden="true" />
                  )}
                  <span className="text-sm">
                    {isLocked ? 'Room Locked' : 'Room Open'}
                  </span>
                </div>
                <Button
                  variant={isLocked ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={toggleLock}
                  aria-label={isLocked ? 'Unlock room' : 'Lock room'}
                >
                  {isLocked ? 'Unlock' : 'Lock'}
                </Button>
              </div>

              {/* Game Mode Selector */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span className="text-sm">Game Mode</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="min-w-[100px]">
                      {gameMode === 'coop' ? 'Co-op' : gameMode.charAt(0).toUpperCase() + gameMode.slice(1)}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover border border-border z-50">
                    <DropdownMenuLabel>Select Mode</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => changeGameMode('classic')}>
                      <span className={cn(gameMode === 'classic' && 'font-bold text-primary')}>
                        🎯 Classic
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeGameMode('team')}>
                      <span className={cn(gameMode === 'team' && 'font-bold text-primary')}>
                        👥 Team Mode
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeGameMode('coop')}>
                      <span className={cn(gameMode === 'coop' && 'font-bold text-primary')}>
                        🤝 Co-op Mode
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Player Management */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" aria-hidden="true" />
                  <span>Manage Players ({participants.length})</span>
                </div>
                
                <div className="max-h-40 overflow-y-auto space-y-1" role="list" aria-label="Players in room">
                  {participants.map((participant) => (
                    <motion.div
                      key={participant.id}
                      layout
                      className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                      role="listitem"
                    >
                      <span className="text-sm truncate flex-1">
                        {participant.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => kickPlayer(participant.id, participant.name)}
                        disabled={kickingId === participant.id}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        aria-label={`Remove ${participant.name} from game`}
                      >
                        <UserX className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                  
                  {participants.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No players yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
