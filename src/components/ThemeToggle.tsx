import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by waiting for mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className="relative h-9 w-9 opacity-0">
        <Moon className="h-4 w-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="relative overflow-hidden"
    >
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? 0 : 180, scale: isDark ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute"
      >
        <Moon className="h-5 w-5" />
      </motion.div>
      <motion.div
        initial={false}
        animate={{ rotate: isDark ? -180 : 0, scale: isDark ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        className="absolute"
      >
        <Sun className="h-5 w-5" />
      </motion.div>
    </Button>
  );
}
