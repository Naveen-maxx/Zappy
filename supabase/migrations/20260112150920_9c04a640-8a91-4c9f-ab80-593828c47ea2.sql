-- Fix PUBLIC_DATA_EXPOSURE: Restrict teams and lobby_reactions visibility

-- Drop overly permissive teams policy
DROP POLICY IF EXISTS "Anyone can view teams" ON teams;

-- Create restricted policy: Only room participants and hosts can view teams
CREATE POLICY "Participants and hosts can view teams"
ON teams
FOR SELECT
USING (
  -- Room participants can see teams in their room
  EXISTS (
    SELECT 1 FROM room_participants
    WHERE room_participants.room_id = teams.room_id
    AND room_participants.user_id = auth.uid()
  )
  OR
  -- Room hosts can see teams
  EXISTS (
    SELECT 1 FROM game_rooms
    WHERE game_rooms.id = teams.room_id
    AND game_rooms.host_id = auth.uid()
  )
);

-- Drop overly permissive lobby_reactions policy
DROP POLICY IF EXISTS "Anyone can view reactions" ON lobby_reactions;

-- Create restricted policy: Only room participants and hosts can view reactions
CREATE POLICY "Participants and hosts can view lobby reactions"
ON lobby_reactions
FOR SELECT
USING (
  -- Room participants can see reactions in their room
  EXISTS (
    SELECT 1 FROM room_participants
    WHERE room_participants.room_id = lobby_reactions.room_id
    AND room_participants.user_id = auth.uid()
  )
  OR
  -- Room hosts can see reactions
  EXISTS (
    SELECT 1 FROM game_rooms
    WHERE game_rooms.id = lobby_reactions.room_id
    AND game_rooms.host_id = auth.uid()
  )
);