-- Enable real-time for teams and team_chat tables
-- This ensures name updates and chat messages are synchronized instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_chat;

-- Ensure replica identity is set to FULL for accurate change detection
ALTER TABLE public.teams REPLICA IDENTITY FULL;
ALTER TABLE public.team_chat REPLICA IDENTITY FULL;
