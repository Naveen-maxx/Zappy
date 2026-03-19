-- Enable RLS on teams table
ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to read teams (for game purposes)
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."teams";
CREATE POLICY "Enable read access for all users"
ON "public"."teams"
FOR SELECT
USING (true);

-- Policy to allow team leaders to update their own team
DROP POLICY IF EXISTS "Enable update for team leaders" ON "public"."teams";
CREATE POLICY "Enable update for team leaders"
ON "public"."teams"
FOR UPDATE
USING (leader_id = auth.participant_id() OR leader_id::text = auth.uid()::text)
WITH CHECK (leader_id = auth.participant_id() OR leader_id::text = auth.uid()::text);

-- NOTE: Since auth.uid() maps to the Supabase Auth User ID, and leader_id is a UUID referencing room_participants(id),
-- we need to check if the current user owns that participant ID.
-- However, room_participants has a user_id column.
-- A more robust check is:
-- leader_id IN (SELECT id FROM room_participants WHERE user_id = auth.uid())

DROP POLICY IF EXISTS "Enable update for team leaders linked to auth" ON "public"."teams";
CREATE POLICY "Enable update for team leaders linked to auth"
ON "public"."teams"
FOR UPDATE
USING (
  leader_id IN (
    SELECT id 
    FROM public.room_participants 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  leader_id IN (
    SELECT id 
    FROM public.room_participants 
    WHERE user_id = auth.uid()
  )
);
