-- Fix 1: Add authorization check to update_game_state_with_server_time RPC
-- Only the room host should be able to update game state
CREATE OR REPLACE FUNCTION public.update_game_state_with_server_time(
  p_room_id uuid,
  p_phase text,
  p_current_question_index int DEFAULT NULL,
  p_current_question jsonb DEFAULT NULL,
  p_correct_answer int DEFAULT NULL,
  p_chat_enabled boolean DEFAULT false,
  p_discussion_duration_seconds int DEFAULT NULL
)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamp with time zone := now();
  v_discussion_ends_at timestamp with time zone := NULL;
BEGIN
  -- Authorization check: ensure caller is the host of the room
  IF NOT EXISTS (
    SELECT 1 FROM public.game_rooms
    WHERE id = p_room_id
    AND host_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only the room host can update game state';
  END IF;

  -- Calculate discussion end time if provided
  IF p_discussion_duration_seconds IS NOT NULL AND p_discussion_duration_seconds > 0 THEN
    v_discussion_ends_at := v_now + (p_discussion_duration_seconds || ' seconds')::interval;
  END IF;

  INSERT INTO public.game_state (
    room_id,
    phase,
    current_question_index,
    current_question,
    correct_answer,
    question_started_at,
    chat_enabled,
    discussion_ends_at,
    updated_at
  )
  VALUES (
    p_room_id,
    p_phase,
    COALESCE(p_current_question_index, 0),
    p_current_question,
    p_correct_answer,
    v_now,
    p_chat_enabled,
    v_discussion_ends_at,
    v_now
  )
  ON CONFLICT (room_id) DO UPDATE SET
    phase = EXCLUDED.phase,
    current_question_index = COALESCE(EXCLUDED.current_question_index, game_state.current_question_index),
    current_question = COALESCE(EXCLUDED.current_question, game_state.current_question),
    correct_answer = EXCLUDED.correct_answer,
    question_started_at = EXCLUDED.question_started_at,
    chat_enabled = EXCLUDED.chat_enabled,
    discussion_ends_at = EXCLUDED.discussion_ends_at,
    updated_at = EXCLUDED.updated_at;

  RETURN v_now;
END;
$$;

-- Fix 2: Replace unrestricted participant DELETE policy with proper authorization
DROP POLICY IF EXISTS "Participants can leave rooms" ON room_participants;

CREATE POLICY "Participants can leave rooms" 
ON room_participants 
FOR DELETE 
USING (
  -- User can only delete their own participation record
  user_id = auth.uid()
  OR
  -- Host can remove participants from their room
  EXISTS (
    SELECT 1 FROM game_rooms
    WHERE game_rooms.id = room_participants.room_id
    AND game_rooms.host_id = auth.uid()
  )
);