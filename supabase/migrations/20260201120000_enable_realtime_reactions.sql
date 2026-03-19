-- Enable realtime for lobby_reactions
-- This is required for reactions to be broadcast to all connected clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_reactions;
