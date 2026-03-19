-- Create a function to update game_state with server-side timestamp
-- This ensures all clients use the same authoritative time source
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
  -- Calculate discussion end time if duration provided
  IF p_discussion_duration_seconds IS NOT NULL AND p_discussion_duration_seconds > 0 THEN
    v_discussion_ends_at := v_now + (p_discussion_duration_seconds || ' seconds')::interval;
  END IF;

  -- Upsert game_state with server timestamp
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
    question_started_at = v_now,
    chat_enabled = EXCLUDED.chat_enabled,
    discussion_ends_at = EXCLUDED.discussion_ends_at,
    updated_at = v_now;

  RETURN v_now;
END;
$$;

-- Grant execute to authenticated users (hosts will call this)
GRANT EXECUTE ON FUNCTION public.update_game_state_with_server_time TO authenticated;