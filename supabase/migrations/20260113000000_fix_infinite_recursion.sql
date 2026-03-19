-- Fix infinite recursion in storage and room_participants policies
-- Issue 1: Storage policy checking room_participants causes recursion
-- Issue 2: room_participants SELECT policy checks itself, causing recursion

-- ============================================
-- Fix 1: Storage policy recursion
-- ============================================

-- Drop the problematic storage policy that causes recursion
DROP POLICY IF EXISTS "Participants can view question images in active games" ON storage.objects;

-- Create a SECURITY DEFINER function to check participant status without RLS recursion
-- This function bypasses RLS, preventing infinite recursion
CREATE OR REPLACE FUNCTION public.is_participant_in_active_game(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.room_participants rp
    INNER JOIN public.game_rooms gr ON rp.room_id = gr.id
    WHERE rp.user_id = _user_id
    AND gr.status IN ('playing', 'finished')
  );
$$;

-- Recreate the storage policy using the SECURITY DEFINER function
-- This bypasses RLS and prevents infinite recursion
CREATE POLICY "Participants can view question images in active games"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'question-images' AND
  public.is_participant_in_active_game(auth.uid())
);

-- ============================================
-- Fix 2: room_participants SELECT policy recursion
-- ============================================

-- Drop the recursive SELECT policy
DROP POLICY IF EXISTS "Participants and hosts can view room participants" ON public.room_participants;
DROP POLICY IF EXISTS "Anyone can view room participants" ON public.room_participants;

-- Create a SECURITY DEFINER function to check if user is participant or host
-- This avoids RLS recursion when checking room_participants
CREATE OR REPLACE FUNCTION public.can_view_room_participants(_room_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = _room_id AND user_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.game_rooms
    WHERE id = _room_id AND host_id = _user_id
  );
$$;

-- Recreate SELECT policy using SECURITY DEFINER function
-- This allows participants and hosts to view participants without recursion
CREATE POLICY "Participants and hosts can view room participants"
ON public.room_participants FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.can_view_room_participants(room_id, auth.uid())
);

-- ============================================
-- Fix 3: Ensure INSERT policy doesn't cause issues
-- ============================================

-- Drop and recreate INSERT policy to be more explicit
DROP POLICY IF EXISTS "Authenticated users can join rooms" ON public.room_participants;

-- Recreate with explicit check that doesn't cause recursion
CREATE POLICY "Authenticated users can join rooms"
ON public.room_participants
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.game_rooms
    WHERE game_rooms.id = room_id
  )
);

