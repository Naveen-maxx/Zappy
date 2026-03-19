-- Drop the existing restrictive INSERT policy for lobby_reactions
DROP POLICY IF EXISTS "Participants can send reactions" ON public.lobby_reactions;

-- Create a new policy that allows anyone who is a participant in the room to react
-- This works for both authenticated and guest users by checking room_participants directly
CREATE POLICY "Anyone in room can send reactions" 
ON public.lobby_reactions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM room_participants 
    WHERE room_participants.id = lobby_reactions.participant_id
    AND room_participants.room_id = lobby_reactions.room_id
  )
);