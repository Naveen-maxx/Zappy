-- RPC to swap or move participants between teams (Host only)
CREATE OR REPLACE FUNCTION public.move_participant_to_team(
  p_participant_id uuid,
  p_target_team_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id uuid;
  v_current_count int;
  v_max_members int;
BEGIN
  -- Get room_id and target team info
  SELECT room_id, max_members INTO v_room_id, v_max_members
  FROM public.teams
  WHERE id = p_target_team_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target team not found';
  END IF;

  -- Check capacity
  SELECT count(*) INTO v_current_count
  FROM public.room_participants
  WHERE team_id = p_target_team_id;

  IF v_current_count >= v_max_members THEN
    RETURN false;
  END IF;

  -- Update participant
  UPDATE public.room_participants
  SET team_id = p_target_team_id
  WHERE id = p_participant_id
  AND room_id = v_room_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participant not found in this room';
  END IF;

  -- Maintain leadership: If teammate leaves, and it was leader, assign new leader
  -- This is handled by a trigger potentially, but let's be explicit if needed.
  -- For now, our join/move logic handles setting leader if NULL.
  
  -- Ensure target team has a leader if it was empty
  UPDATE public.teams
  SET leader_id = p_participant_id
  WHERE id = p_target_team_id
  AND leader_id IS NULL;

  RETURN true;
END;
$$;

-- RPC to swap two participants
CREATE OR REPLACE FUNCTION public.swap_participants_between_teams(
  p_participant_a_id uuid,
  p_participant_b_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_a uuid;
  v_team_b uuid;
  v_room_a uuid;
  v_room_b uuid;
BEGIN
  -- Get current teams
  SELECT team_id, room_id INTO v_team_a, v_room_a FROM public.room_participants WHERE id = p_participant_a_id;
  SELECT team_id, room_id INTO v_team_b, v_room_b FROM public.room_participants WHERE id = p_participant_b_id;

  IF v_room_a != v_room_b THEN
    RAISE EXCEPTION 'Participants are in different rooms';
  END IF;

  -- Swap them
  UPDATE public.room_participants SET team_id = v_team_b WHERE id = p_participant_a_id;
  UPDATE public.room_participants SET team_id = v_team_a WHERE id = p_participant_b_id;

  -- Handle leadership updates if necessary
  -- Reset leaders and let them be re-assigned or keep same if they are still in team
  -- Simpler: Just ensure both teams have A leader (might be same person if they moved)
  
  UPDATE public.teams SET leader_id = p_participant_a_id WHERE id = v_team_b AND leader_id IS NULL;
  UPDATE public.teams SET leader_id = p_participant_b_id WHERE id = v_team_a AND leader_id IS NULL;

  RETURN true;
END;
$$;
