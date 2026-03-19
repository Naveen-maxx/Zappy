-- Fix STORAGE_EXPOSURE: Make question-images bucket private and use owner-based access

-- Change bucket to private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'question-images';

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view question images" ON storage.objects;

-- Create owner-scoped SELECT policy (users can view their own uploads)
CREATE POLICY "Quiz owners can view their question images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'question-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Also add SELECT access for game participants viewing during active games
-- This allows images to be displayed to players during live quizzes
CREATE POLICY "Participants can view question images in active games"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'question-images' AND
  EXISTS (
    SELECT 1 FROM room_participants rp
    INNER JOIN game_rooms gr ON rp.room_id = gr.id
    WHERE rp.user_id = auth.uid()
    AND gr.status IN ('playing', 'finished')
  )
);