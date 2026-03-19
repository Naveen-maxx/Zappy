-- Fix 1: MISSING_RLS - Add explicit auth check to room_participants policy
DROP POLICY IF EXISTS "Participants and hosts can view room participants" ON room_participants;

CREATE POLICY "Participants and hosts can view room participants"
ON room_participants FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM room_participants AS my_participation
      WHERE my_participation.room_id = room_participants.room_id
      AND my_participation.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM game_rooms
      WHERE game_rooms.id = room_participants.room_id
      AND game_rooms.host_id = auth.uid()
    )
  )
);

-- Fix 2: INPUT_VALIDATION - Add message length constraint to team_chat
ALTER TABLE team_chat ADD CONSTRAINT message_length_check 
CHECK (length(message) <= 500);

-- Fix 3: OPEN_ENDPOINTS - Create rate limit tracking table for AI generation
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

-- Enable RLS on rate limits table
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write their own rate limits
CREATE POLICY "Users can manage their own rate limits"
ON api_rate_limits FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);