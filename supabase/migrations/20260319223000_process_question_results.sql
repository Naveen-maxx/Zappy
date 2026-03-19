-- Create function to securely process question results in Postgres
-- This eliminates the bug where a host disconnecting freezes the game,
-- by allowing any client to securely trigger this exactly once per question.

CREATE OR REPLACE FUNCTION process_question_results(p_room_id uuid, p_question_index integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game_state record;
  v_room record;
  v_quiz record;
  v_question jsonb;
  v_correct_value integer;
  v_base_points integer := 1000;
  v_decay_rate integer := 50;
  v_question_start_time timestamp with time zone;
  v_game_mode text;
  
  v_answer record;
  v_correct_position integer := 0;
  v_points integer;
  v_is_correct boolean;
  
  v_participant_ids uuid[];
  v_p_id uuid;
  v_p_data record;
  
  v_new_streak integer;
  v_new_max_streak integer;
  v_new_avg_time integer;
  v_response_time_ms integer;
  
  v_team record;
  v_team_score integer;
BEGIN
  -- 1. Lock the game state to prevent concurrent results processing from multiple clients
  SELECT * INTO v_game_state FROM game_state WHERE room_id = p_room_id FOR UPDATE;
  
  -- If already processed or not in question phase, exit safely and quietly
  IF v_game_state.phase != 'question' THEN
    RETURN;
  END IF;

  v_question_start_time := v_game_state.question_started_at;

  -- 2. Fetch the correct answer from the quiz
  SELECT quiz_id, game_mode INTO v_room FROM game_rooms WHERE id = p_room_id;
  v_game_mode := v_room.game_mode;
  
  SELECT questions INTO v_quiz FROM quizzes WHERE id = v_room.quiz_id;
  
  v_question := v_quiz.questions->p_question_index;
  IF v_question->>'type' = 'code-debug' THEN
    v_correct_value := (v_question->>'correctLine')::integer;
  ELSE
    v_correct_value := (v_question->>'correctIndex')::integer;
  END IF;

  -- 3. Process answers sorted by answered_at (earliest first for position decay)
  FOR v_answer IN 
    SELECT * FROM participant_answers 
    WHERE room_id = p_room_id AND question_index = p_question_index
    ORDER BY answered_at ASC
  LOOP
    v_is_correct := (v_answer.answer_index = v_correct_value);
    v_points := 0;
    
    IF v_is_correct THEN
      v_points := GREATEST(100, v_base_points - (v_correct_position * v_decay_rate));
      v_correct_position := v_correct_position + 1;
    END IF;

    -- Update the answer record securely
    UPDATE participant_answers 
    SET is_correct = v_is_correct, points_earned = v_points 
    WHERE id = v_answer.id;

    -- Identify who gets the points (Co-op mode distributes to the whole team)
    v_participant_ids := ARRAY[v_answer.participant_id];
    
    IF v_game_mode = 'coop' THEN
      SELECT team_id INTO v_p_data FROM room_participants WHERE id = v_answer.participant_id;
      IF v_p_data.team_id IS NOT NULL THEN
        SELECT array_agg(id) INTO v_participant_ids FROM room_participants WHERE team_id = v_p_data.team_id;
      END IF;
    END IF;

    -- Update each participant's stats
    FOREACH v_p_id IN ARRAY v_participant_ids
    LOOP
      SELECT * INTO v_p_data FROM room_participants WHERE id = v_p_id;
      
      v_new_streak := CASE WHEN v_is_correct THEN COALESCE(v_p_data.current_streak, 0) + 1 ELSE 0 END;
      v_new_max_streak := GREATEST(COALESCE(v_p_data.max_streak, 0), v_new_streak);
      
      -- Calculate avg response time. Only for the actual answerer to avoid skew.
      v_new_avg_time := COALESCE(v_p_data.avg_response_time_ms, 0);
      IF v_p_id = v_answer.participant_id AND v_question_start_time IS NOT NULL AND v_answer.answered_at IS NOT NULL THEN
        v_response_time_ms := EXTRACT(EPOCH FROM (v_answer.answered_at - v_question_start_time)) * 1000;
        IF COALESCE(v_p_data.total_answers, 0) > 0 AND v_new_avg_time > 0 THEN
          v_new_avg_time := round(((v_new_avg_time * v_p_data.total_answers) + v_response_time_ms) / (v_p_data.total_answers + 1));
        ELSE
          v_new_avg_time := v_response_time_ms;
        END IF;
      END IF;

      UPDATE room_participants 
      SET 
        score = COALESCE(score, 0) + v_points,
        current_streak = v_new_streak,
        max_streak = v_new_max_streak,
        total_answers = COALESCE(total_answers, 0) + 1,
        total_correct = COALESCE(total_correct, 0) + CASE WHEN v_is_correct THEN 1 ELSE 0 END,
        avg_response_time_ms = v_new_avg_time
      WHERE id = v_p_id;
    END LOOP;

  END LOOP;

  -- 4. Automatically update team cumulative scores for Team or Co-op mode
  IF v_game_mode IN ('team', 'coop') THEN
    FOR v_team IN SELECT id FROM teams WHERE room_id = p_room_id LOOP
      SELECT SUM(score) INTO v_team_score FROM room_participants WHERE team_id = v_team.id;
      UPDATE teams SET score = COALESCE(v_team_score, 0) WHERE id = v_team.id;
    END LOOP;
  END IF;

  -- 5. Finalize the game state transition so all clients update instantly
  UPDATE game_state 
  SET 
    phase = 'results',
    correct_answer = v_correct_value,
    chat_enabled = false,
    discussion_ends_at = null,
    updated_at = NOW()
  WHERE room_id = p_room_id;

END;
$$;
