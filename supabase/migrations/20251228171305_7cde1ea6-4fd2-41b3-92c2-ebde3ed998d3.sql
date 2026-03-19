-- Create table to store game results with top 3 winners
CREATE TABLE public.game_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  host_id UUID NOT NULL,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_participants INTEGER NOT NULL DEFAULT 0,
  winner_1_name TEXT,
  winner_1_score INTEGER,
  winner_1_avatar_id INTEGER,
  winner_2_name TEXT,
  winner_2_score INTEGER,
  winner_2_avatar_id INTEGER,
  winner_3_name TEXT,
  winner_3_score INTEGER,
  winner_3_avatar_id INTEGER
);

-- Enable RLS
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;

-- Hosts can view their own game results
CREATE POLICY "Hosts can view their game results"
ON public.game_results
FOR SELECT
USING (auth.uid() = host_id);

-- Hosts can insert their game results
CREATE POLICY "Hosts can insert game results"
ON public.game_results
FOR INSERT
WITH CHECK (auth.uid() = host_id);

-- Create index for faster lookups
CREATE INDEX idx_game_results_quiz_id ON public.game_results(quiz_id);
CREATE INDEX idx_game_results_host_id ON public.game_results(host_id);