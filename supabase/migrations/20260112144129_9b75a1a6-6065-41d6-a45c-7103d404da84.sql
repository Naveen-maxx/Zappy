-- Create storage bucket for question images
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true);

-- Allow authenticated users to upload images to question-images bucket
CREATE POLICY "Authenticated users can upload question images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'question-images');

-- Allow public read access to question images
CREATE POLICY "Anyone can view question images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'question-images');

-- Allow users to update their own uploaded images
CREATE POLICY "Users can update their own question images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'question-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own uploaded images
CREATE POLICY "Users can delete their own question images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'question-images' AND auth.uid()::text = (storage.foldername(name))[1]);