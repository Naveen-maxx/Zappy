-- Fix PUBLIC_DATA_EXPOSURE: Restrict player_titles visibility

-- Drop overly permissive player_titles policy
DROP POLICY IF EXISTS "Anyone can view player titles" ON player_titles;

-- Create restricted policy: Only room participants and hosts can view player titles
CREATE POLICY "Participants and hosts can view player titles"
ON player_titles
FOR SELECT
USING (
  -- Room participants can see titles in their room
  EXISTS (
    SELECT 1 FROM room_participants
    WHERE room_participants.room_id = player_titles.room_id
    AND room_participants.user_id = auth.uid()
  )
  OR
  -- Room hosts can see titles
  EXISTS (
    SELECT 1 FROM game_rooms
    WHERE game_rooms.id = player_titles.room_id
    AND game_rooms.host_id = auth.uid()
  )
);