-- Fix race condition in join_team_slot by adding FOR UPDATE to serialize concurrent requests
CREATE OR REPLACE FUNCTION public.join_team_slot(
  p_team_id uuid,
  p_participant_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count int;
  v_max_members int;
  v_room_id uuid;
BEGIN
  -- Get team info AND lock the row to prevent race conditions
  -- This forces concurrent join requests to evaluate sequentially
  SELECT room_id, max_members INTO v_room_id, v_max_members
  FROM public.teams
  WHERE id = p_team_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  -- Get current member count for this team
  SELECT count(*) INTO v_current_count
  FROM public.room_participants
  WHERE team_id = p_team_id;

  -- Check if slot available
  IF v_current_count >= v_max_members THEN
    -- If full, return false and release the lock
    RETURN false;
  END IF;

  -- Assign participant to team
  UPDATE public.room_participants
  SET team_id = p_team_id
  WHERE id = p_participant_id
  AND room_id = v_room_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participant not found in this room';
  END IF;

  -- Set leader if none exists
  UPDATE public.teams
  SET leader_id = p_participant_id
  WHERE id = p_team_id
  AND leader_id IS NULL;

  RETURN true;
END;
$$;
