-- =============================================
-- ZAPPY NEXT-GEN UPGRADE: Database Schema
-- =============================================

-- 1. Add game mode to game_rooms
ALTER TABLE public.game_rooms
ADD COLUMN IF NOT EXISTS game_mode text NOT NULL DEFAULT 'classic',
ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

-- 2. Add streak tracking to room_participants
ALTER TABLE public.room_participants
ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_streak integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_correct integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_answers integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_response_time_ms integer DEFAULT NULL;

-- 3. Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'blue',
  leader_id uuid REFERENCES public.room_participants(id) ON DELETE SET NULL,
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Teams RLS policies
CREATE POLICY "Anyone can view teams"
ON public.teams FOR SELECT USING (true);

CREATE POLICY "Hosts can create teams"
ON public.teams FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.game_rooms
    WHERE game_rooms.id = teams.room_id
      AND game_rooms.host_id = auth.uid()
  )
);

CREATE POLICY "Hosts can update teams"
ON public.teams FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.game_rooms
    WHERE game_rooms.id = teams.room_id
      AND game_rooms.host_id = auth.uid()
  )
);

CREATE POLICY "Hosts can delete teams"
ON public.teams FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.game_rooms
    WHERE game_rooms.id = teams.room_id
      AND game_rooms.host_id = auth.uid()
  )
);

-- 4. Add team_id to room_participants
ALTER TABLE public.room_participants
ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- 5. Create lobby_reactions table for emoji reactions
CREATE TABLE IF NOT EXISTS public.lobby_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.room_participants(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on lobby_reactions
ALTER TABLE public.lobby_reactions ENABLE ROW LEVEL SECURITY;

-- Reactions RLS policies
CREATE POLICY "Anyone can view reactions"
ON public.lobby_reactions FOR SELECT USING (true);

CREATE POLICY "Participants can send reactions"
ON public.lobby_reactions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_participants.id = lobby_reactions.participant_id
      AND room_participants.user_id = auth.uid()
  )
);

-- Enable realtime for lobby_reactions
ALTER TABLE public.lobby_reactions REPLICA IDENTITY FULL;

-- 6. Create team_chat table for co-op mode
CREATE TABLE IF NOT EXISTS public.team_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.room_participants(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on team_chat
ALTER TABLE public.team_chat ENABLE ROW LEVEL SECURITY;

-- Team chat RLS policies - only team members can view their team's chat
CREATE POLICY "Team members can view their team chat"
ON public.team_chat FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_participants.id = team_chat.participant_id
      AND room_participants.team_id = team_chat.team_id
  )
  OR
  EXISTS (
    SELECT 1 FROM public.game_rooms
    WHERE game_rooms.id = team_chat.room_id
      AND game_rooms.host_id = auth.uid()
  )
);

CREATE POLICY "Team members can send chat messages"
ON public.team_chat FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_participants.id = team_chat.participant_id
      AND room_participants.team_id = team_chat.team_id
      AND room_participants.user_id = auth.uid()
  )
);

-- Enable realtime for team_chat
ALTER TABLE public.team_chat REPLICA IDENTITY FULL;

-- 7. Add discussion phase timing to game_state
ALTER TABLE public.game_state
ADD COLUMN IF NOT EXISTS discussion_ends_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS chat_enabled boolean NOT NULL DEFAULT false;

-- 8. Create player_titles table for awarded titles
CREATE TABLE IF NOT EXISTS public.player_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.room_participants(id) ON DELETE CASCADE,
  title_type text NOT NULL,
  title_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, participant_id, title_type)
);

-- Enable RLS on player_titles
ALTER TABLE public.player_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view player titles"
ON public.player_titles FOR SELECT USING (true);

CREATE POLICY "Hosts can assign titles"
ON public.player_titles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.game_rooms
    WHERE game_rooms.id = player_titles.room_id
      AND game_rooms.host_id = auth.uid()
  )
);

-- Enable realtime for new tables
ALTER TABLE public.teams REPLICA IDENTITY FULL;
ALTER TABLE public.player_titles REPLICA IDENTITY FULL;