import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Global cache to ensure we only fetch the offset once per session
let globalOffset: number | null = null;
let isFetching = false;
let fetchPromise: Promise<number> | null = null;

export function useServerTimeOffset() {
  const [offset, setOffset] = useState<number>(globalOffset || 0);

  useEffect(() => {
    // If we've already calculated the offset, just use it
    if (globalOffset !== null) {
      setOffset(globalOffset);
      return;
    }

    const fetchOffset = async () => {
      try {
        const t0 = Date.now();
        const { data, error } = await (supabase.rpc as any)('get_server_time');
        const t1 = Date.now();
        
        if (!error && data) {
          const serverTime = new Date(data).getTime();
          // Assuming symmetric network latency, the exact time the server
          // generated the timestamp was exactly halfway between request and response
          const estimatedLocalTimeAtServer = t0 + (t1 - t0) / 2;
          
          // Calculate the difference: Add this offset to any local Date.now()
          // to get the estimated real server time.
          const calculatedOffset = serverTime - estimatedLocalTimeAtServer;
          
          globalOffset = calculatedOffset;
          setOffset(calculatedOffset);
          console.log(`[Time Sync] Clock drift detected: ${calculatedOffset}ms (Latency: ${t1 - t0}ms)`);
        }
      } catch (e) {
        console.error("Failed to sync server time:", e);
      }
      return globalOffset || 0;
    };

    // Prevent strictly concurrent React mounts from making double requests
    if (!isFetching) {
      isFetching = true;
      fetchPromise = fetchOffset().finally(() => { 
        isFetching = false; 
      });
      fetchPromise.then(setOffset);
    } else if (fetchPromise) {
      fetchPromise.then(setOffset);
    }
  }, []);

  return offset;
}
