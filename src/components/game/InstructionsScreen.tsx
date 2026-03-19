import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Users, Crown, Zap, Clock, ShieldCheck, MessageCircle, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InstructionsScreenProps {
    gameMode: 'classic' | 'team' | 'coop';
    isLeader?: boolean;
    endsAt: Date | null;
}

export function InstructionsScreen({ gameMode, isLeader, endsAt }: InstructionsScreenProps) {
    const [timeLeft, setTimeLeft] = useState<number>(15);

    useEffect(() => {
        if (!endsAt) return;

        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining <= 0) clearInterval(interval);
        }, 100);

        return () => clearInterval(interval);
    }, [endsAt]);

    const getInstructions = () => {
        switch (gameMode) {
            case 'classic':
                return [
                    {
                        icon: <Zap className="w-6 h-6 text-yellow-400" />,
                        title: "Individual Play",
                        text: "It's every player for themselves! Answer correctly as fast as possible."
                    },
                    {
                        icon: <Clock className="w-6 h-6 text-blue-400" />,
                        title: "Speed Matters",
                        text: "Correct answers earn more points the faster you submit."
                    },
                    {
                        icon: <ShieldCheck className="w-6 h-6 text-green-400" />,
                        title: "Winning",
                        text: "Score big to climb the leaderboard and take the #1 spot!"
                    }
                ];
            case 'team':
                return [
                    {
                        icon: <Users className="w-6 h-6 text-purple-400" />,
                        title: "Team Battle",
                        text: "Compete together! Your team's score is the total of all members."
                    },
                    {
                        icon: <Zap className="w-6 h-6 text-yellow-400" />,
                        title: "Individual Effort",
                        text: "Everyone answers! Every point you earn helps your team win."
                    },
                    {
                        icon: <Crown className="w-6 h-6 text-pink-400" />,
                        title: "Team Rankings",
                        text: "Keep your team at the top to win the game together!"
                    }
                ];
            case 'coop':
                return [
                    {
                        icon: <MessageCircle className="w-6 h-6 text-amber-400" />,
                        title: "Team Discussion",
                        text: "Use the team chat during the 30s discussion phase to pick the right answer."
                    },
                    {
                        icon: <Crown className="w-6 h-6 text-pink-400" />,
                        title: isLeader ? "You are the Leader!" : "Follow the Leader",
                        text: isLeader
                            ? "Listen to your team and submit the final answer after the discussion."
                            : "Help your leader by discussing options in chat. Only they can submit!"
                    },
                    {
                        icon: <Users className="w-6 h-6 text-indigo-400" />,
                        title: "Shared Success",
                        text: "Incorrect answers cost points. Correct ones boost the entire team!"
                    }
                ];
            default:
                return [];
        }
    };

    const instructions = getInstructions();
    const modeTitle = gameMode === 'coop' ? 'Co-op Mode' : gameMode === 'team' ? 'Team Mode' : 'Classic Mode';
    const modeGradient = gameMode === 'coop'
        ? 'from-amber-400 to-pink-500'
        : gameMode === 'team'
            ? 'from-purple-500 to-indigo-500'
            : 'from-blue-500 to-cyan-400';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/95 backdrop-blur-xl">
            <div className="max-w-2xl w-full">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center mb-6 md:mb-12"
                >
                    <div className={cn(
                        "inline-flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r text-white font-bold text-lg mb-6 shadow-xl",
                        modeGradient
                    )}>
                        <Info className="w-5 h-5" />
                        How to Play: {modeTitle}
                    </div>

                    <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 tracking-tight">
                        Game starting in...
                    </h2>

                    <div className="flex justify-center">
                        <div className="relative">
                            <span className="text-7xl font-display font-black gradient-text tabular-nums">
                                {timeLeft}
                            </span>
                            <motion.div
                                className="absolute -bottom-2 left-0 right-0 h-1 bg-primary/30 rounded-full overflow-hidden"
                            >
                                <motion.div
                                    className="h-full bg-primary"
                                    initial={{ width: "100%" }}
                                    animate={{ width: "0%" }}
                                    transition={{ duration: 15, ease: "linear" }}
                                />
                            </motion.div>
                        </div>
                    </div>
                </motion.div>

                <div className="grid gap-4">
                    <AnimatePresence mode="popLayout">
                        {instructions.map((item, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.2 + 0.5 }}
                                className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-card/50 border border-white/5 rounded-2xl hover:bg-card/80 transition-colors group"
                            >
                                <div className="p-3 bg-muted rounded-xl group-hover:scale-110 transition-transform">
                                    {item.icon}
                                </div>
                                <div className="text-left">
                                    <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {item.text}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2 }}
                    className="mt-6 md:mt-12 text-muted-foreground text-sm font-medium italic"
                >
                    Pay attention, the first question is coming up fast!
                </motion.p>


            </div>
        </div>
    );
}
