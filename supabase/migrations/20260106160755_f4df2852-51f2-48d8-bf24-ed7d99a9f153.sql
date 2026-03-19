-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can join rooms" ON public.room_participants;

-- Create a new policy that allows anyone to join rooms (for guest participants)
-- The room must exist and be in 'waiting' status
CREATE POLICY "Anyone can join waiting rooms" 
ON public.room_participants 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM game_rooms 
    WHERE game_rooms.id = room_id 
    AND game_rooms.status = 'waiting'
    AND game_rooms.is_locked = false
  )
);

-- Also update the DELETE policy to allow guests to leave
DROP POLICY IF EXISTS "Users can leave rooms" ON public.room_participants;

-- Recreate delete policy - allow anyone to delete their own record (by matching user_id from insert)
CREATE POLICY "Participants can leave rooms" 
ON public.room_participants 
FOR DELETE 
USING (true);