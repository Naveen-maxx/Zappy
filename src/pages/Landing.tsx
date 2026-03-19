import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Users, Sparkles, Zap } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-16">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-display text-3xl font-bold gradient-text flex items-center gap-2"
          >
            <img src="/logo.png" alt="Zappy" className="w-10 h-10 rounded-xl object-cover" />
            Zappy
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <Button variant="outline" onClick={() => navigate('/login')}>
              Sign In
            </Button>
          </motion.div>
        </header>

        {/* Hero */}
        <main className="flex flex-col items-center text-center mt-12 md:mt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <span className="px-4 py-2 bg-primary/20 rounded-full text-primary font-medium text-sm">
              🎮 Real-time multiplayer quizzes
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl sm:text-5xl md:text-7xl font-display font-bold mb-6 leading-tight"
          >
            Think, Tap &{' '}
            <span className="gradient-text">Win!</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-muted-foreground max-w-2xl mb-12"
          >
            Create AI-powered quizzes, host live game rooms, and challenge players worldwide. Fast, fun, and free!
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button
              size="lg"
              className="text-lg px-8 py-6 neon-glow w-full sm:w-auto"
              onClick={() => navigate('/join')}
            >
              <Gamepad2 className="mr-2" />
              Join a Quiz
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 w-full sm:w-auto"
              onClick={() => navigate('/register')}
            >
              <Sparkles className="mr-2" />
              Create Quizzes
            </Button>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 w-full max-w-4xl"
          >
            {[
              { icon: Sparkles, title: 'AI-Generated', desc: 'Questions created instantly from any topic' },
              { icon: Zap, title: 'Real-time', desc: 'Live scoring and leaderboards' },
              { icon: Users, title: 'Multiplayer', desc: 'Compete with friends or strangers' },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                whileHover={{ y: -5 }}
                className="glass-card rounded-2xl p-6 text-center"
              >
                <feature.icon className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-display font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="mt-24 pb-8 text-center text-muted-foreground text-sm opacity-60">
          <p>© 2026 Zappy. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
