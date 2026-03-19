-- Create a function to get the current server timestamp
-- This is used to calculate time offset for clients and ensure timers
-- display correctly regardless of local client clock skew.

CREATE OR REPLACE FUNCTION get_server_time()
RETURNS timestamp with time zone
LANGUAGE sql
STABLE
AS $$
  SELECT current_timestamp;
$$;
