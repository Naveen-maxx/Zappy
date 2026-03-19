import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useServerTimeOffset } from '@/hooks/useServerTimeOffset';

interface CountdownTimerProps {
  duration: number; // in seconds
  serverStartTime?: string | null; // ISO timestamp when question started on server
  onComplete?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeConfig = {
  sm: { diameter: 60, stroke: 4, fontSize: 'text-xl' },
  md: { diameter: 100, stroke: 6, fontSize: 'text-3xl' },
  lg: { diameter: 140, stroke: 8, fontSize: 'text-5xl' },
};

export function CountdownTimer({
  duration,
  serverStartTime,
  onComplete,
  size = 'md',
  className,
}: CountdownTimerProps) {
  const { diameter, stroke, fontSize } = sizeConfig[size];
  const radius = (diameter - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const hasCompletedRef = useRef(false);
  const timeOffset = useServerTimeOffset();

  // Calculate time left based on server start time
  // Applies the server-client offset to synchronize perfectly regardless of local clock skew
  const calculateTimeLeft = useCallback(() => {
    if (serverStartTime) {
      const startTime = new Date(serverStartTime).getTime();
      const synchronizedNow = Date.now() + timeOffset;
      const elapsed = Math.floor((synchronizedNow - startTime) / 1000);
      return Math.max(0, duration - elapsed);
    }
    return duration;
  }, [serverStartTime, duration, timeOffset]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  // Reset when duration or serverStartTime changes
  useEffect(() => {
    hasCompletedRef.current = false;
    setTimeLeft(calculateTimeLeft());
  }, [duration, serverStartTime, calculateTimeLeft]);

  // Recalculate on visibility change (tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeLeft(calculateTimeLeft());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [calculateTimeLeft]);

  // Use server-synchronized interval
  useEffect(() => {
    if (timeLeft <= 0) {
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onComplete?.();
      }
      return;
    }

    // Recalculate based on server time every tick to stay in sync
    const timer = setInterval(() => {
      const newTime = calculateTimeLeft();
      setTimeLeft(newTime);
      
      if (newTime <= 0 && !hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onComplete, calculateTimeLeft]);

  const progress = (timeLeft / duration) * circumference;
  const isUrgent = timeLeft <= 5;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={diameter}
        height={diameter}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        {/* Progress circle */}
        <motion.circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke={isUrgent ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          initial={false}
          animate={{
            strokeDashoffset: circumference - progress,
            stroke: isUrgent ? 'hsl(var(--destructive))' : 'hsl(var(--primary))',
          }}
          transition={{ duration: 0.3 }}
        />
      </svg>
      
      {/* Timer text */}
      <motion.span
        className={cn(
          'absolute font-display font-bold',
          fontSize,
          isUrgent ? 'text-destructive' : 'text-foreground'
        )}
        animate={isUrgent ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5, repeat: isUrgent ? Infinity : 0 }}
      >
        {timeLeft}
      </motion.span>
    </div>
  );
}
