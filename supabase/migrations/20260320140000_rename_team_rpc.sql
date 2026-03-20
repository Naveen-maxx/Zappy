-- Create RPC to allow team leaders to rename their teams
-- This bypasses RLS for guests while ensuring only the leader can perform the action
CREATE OR REPLACE FUNCTION public.rename_team(
  p_team_id uuid,
  p_participant_id uuid,
  p_new_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_leader_id uuid;
BEGIN
  -- Get the current leader_id for the team
  SELECT leader_id INTO v_leader_id
  FROM public.teams
  WHERE id = p_team_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  -- Verify the participant is the leader
  IF v_leader_id IS NULL OR v_leader_id != p_participant_id THEN
    RETURN false;
  END IF;

  -- Update the name (removed updated_at as it doesn't exist in the schema)
  UPDATE public.teams
  SET name = p_new_name
  WHERE id = p_team_id;

  RETURN true;
END;
$$;
