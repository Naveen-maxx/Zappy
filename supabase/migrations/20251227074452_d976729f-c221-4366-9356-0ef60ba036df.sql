-- Create game_state table to track current game phase and question
CREATE TABLE public.game_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  phase TEXT NOT NULL DEFAULT 'waiting',
  current_question_index INTEGER NOT NULL DEFAULT 0,
  current_question JSONB,
  correct_answer INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id)
);

-- Create participant_answers table to track answers
CREATE TABLE public.participant_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.room_participants(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  answer_index INTEGER NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  UNIQUE(room_id, participant_id, question_index)
);

-- Enable RLS
ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_answers ENABLE ROW LEVEL SECURITY;

-- RLS policies for game_state
CREATE POLICY "Anyone can view game state"
ON public.game_state
FOR SELECT
USING (true);

CREATE POLICY "Hosts can update game state"
ON public.game_state
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.game_rooms
    WHERE game_rooms.id = room_id AND game_rooms.host_id = auth.uid()
  )
);

CREATE POLICY "Hosts can modify game state"
ON public.game_state
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.game_rooms
    WHERE game_rooms.id = room_id AND game_rooms.host_id = auth.uid()
  )
);

-- RLS policies for participant_answers
CREATE POLICY "Anyone in room can view answers"
ON public.participant_answers
FOR SELECT
USING (true);

CREATE POLICY "Participants can submit their answers"
ON public.participant_answers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_participants.id = participant_id AND room_participants.user_id = auth.uid()
  )
);

-- Add UPDATE policy for room_participants so hosts can update scores
CREATE POLICY "Hosts can update participant scores"
ON public.room_participants
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.game_rooms
    WHERE game_rooms.id = room_id AND game_rooms.host_id = auth.uid()
  )
);

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participant_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;