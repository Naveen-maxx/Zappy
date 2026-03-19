-- Fix PUBLIC_DATA_EXPOSURE: Restrict room_participants read access
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view room participants" ON room_participants;

-- Create restricted policy that only allows:
-- 1. Participants in the same room to view each other
-- 2. Room hosts to view their room participants
CREATE POLICY "Participants and hosts can view room participants"
ON room_participants
FOR SELECT
USING (
  -- Allow viewing participants in rooms where user is also a participant
  EXISTS (
    SELECT 1 FROM room_participants AS my_participation
    WHERE my_participation.room_id = room_participants.room_id
    AND my_participation.user_id = auth.uid()
  )
  OR
  -- Allow hosts to view their room participants
  EXISTS (
    SELECT 1 FROM game_rooms
    WHERE game_rooms.id = room_participants.room_id
    AND game_rooms.host_id = auth.uid()
  )
);