-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  play_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Users can view their own quizzes
CREATE POLICY "Users can view their own quizzes" 
ON public.quizzes 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own quizzes
CREATE POLICY "Users can create their own quizzes" 
ON public.quizzes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own quizzes
CREATE POLICY "Users can update their own quizzes" 
ON public.quizzes 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own quizzes
CREATE POLICY "Users can delete their own quizzes" 
ON public.quizzes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updating timestamps
CREATE TRIGGER update_quizzes_updated_at
BEFORE UPDATE ON public.quizzes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create game_rooms table for waiting room presence
CREATE TABLE public.game_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  host_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'live', 'ended')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for game_rooms
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

-- Anyone can view game rooms (needed to join)
CREATE POLICY "Anyone can view game rooms" 
ON public.game_rooms 
FOR SELECT 
USING (true);

-- Only authenticated users can create rooms
CREATE POLICY "Authenticated users can create rooms" 
ON public.game_rooms 
FOR INSERT 
WITH CHECK (auth.uid() = host_id);

-- Hosts can update their own rooms
CREATE POLICY "Hosts can update their rooms" 
ON public.game_rooms 
FOR UPDATE 
USING (auth.uid() = host_id);

-- Create room_participants table
CREATE TABLE public.room_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  avatar_id INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for room_participants
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

-- Enable realtime for room_participants
ALTER TABLE public.room_participants REPLICA IDENTITY FULL;

-- Anyone can view participants in a room
CREATE POLICY "Anyone can view room participants" 
ON public.room_participants 
FOR SELECT 
USING (true);

-- Authenticated users can join rooms
CREATE POLICY "Authenticated users can join rooms" 
ON public.room_participants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can leave (delete themselves)
CREATE POLICY "Users can leave rooms" 
ON public.room_participants 
FOR DELETE 
USING (auth.uid() = user_id);

-- Enable realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;