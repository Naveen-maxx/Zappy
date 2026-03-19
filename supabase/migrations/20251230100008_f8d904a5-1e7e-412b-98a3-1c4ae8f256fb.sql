-- Add question_started_at column to game_state for timer sync
ALTER TABLE public.game_state 
ADD COLUMN IF NOT EXISTS question_started_at TIMESTAMP WITH TIME ZONE;