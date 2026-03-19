-- Trigger to automatically create game_state when a new game_room is created
CREATE OR REPLACE FUNCTION public.handle_new_game_room()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.game_state (room_id, phase)
  VALUES (NEW.id, 'waiting')
  ON CONFLICT (room_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_game_room_created ON public.game_rooms;
CREATE TRIGGER on_game_room_created
  AFTER INSERT ON public.game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_game_room();

-- Ensure max_members column exists (re-run as safety check)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'max_members') THEN
    ALTER TABLE public.teams ADD COLUMN max_members int DEFAULT 5;
  END IF;
END $$;
