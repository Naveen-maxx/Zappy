import React, { forwardRef } from 'react';
import { Trophy, Users, Zap, Crown, PartyPopper } from 'lucide-react';
import { AnimatedAvatar } from '../game/AnimatedAvatar';
import { cn } from '@/lib/utils';

interface HostCardProps {
    quizTitle?: string;
    hostName: string;
    totalPlayers: number;
    winners: {
        name: string;
        avatarId: number;
        score: number;
    }[];
    theme?: 'dark' | 'light';
}

export const HostCard = forwardRef<HTMLDivElement, HostCardProps>(({
    quizTitle = 'Live Quiz',
    hostName,
    totalPlayers,
    winners,
    theme = 'dark'
}, ref) => {
    const isDark = theme === 'dark';

    return (
        <div
            ref={ref}
            className={cn(
                "w-[600px] h-[800px] relative overflow-hidden flex flex-col p-8",
                isDark ? "bg-[#0F172A] text-white" : "bg-white text-slate-900"
            )}
        >
            {/* Background Elements */}
            <div className="absolute inset-0 z-0">
                <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-br ${isDark ? 'from-indigo-900/40 via-purple-900/20 to-slate-900' : 'from-indigo-100 via-purple-50 to-white'}`} />
                <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-600/20 blur-[100px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-500/10 blur-[100px] rounded-full" />
                {/* Confetti-like dots */}
                <div className="absolute inset-0 opacity-30" style={{
                    backgroundImage: 'radial-gradient(circle, #8B5CF6 2px, transparent 2.5px)',
                    backgroundSize: '40px 40px'
                }} />
            </div>

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col items-center">
                {/* Header */}
                <div className="w-full flex justify-between items-center mb-8">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="Zappy" className="w-10 h-10 rounded-xl shadow-lg" />
                        <span className="font-display text-2xl font-bold tracking-tight">Zappy</span>
                    </div>
                    <span className="font-display font-bold text-sm tracking-wider uppercase opacity-60">
                        Think. Tap. Win.
                    </span>
                </div>

                {/* Hero Text */}
                <div className="text-center mb-10 space-y-4">
                    <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-xl mb-4">
                        <Users className="w-5 h-5 text-purple-400" />
                        <span className="font-bold text-lg">{totalPlayers} Players Joined!</span>
                    </div>

                    <h1 className="font-display text-5xl font-black leading-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400">
                        Brains were tested.<br />Winners were crowned 👑
                    </h1>

                    <div className="flex justify-center -mb-2">
                        <Crown className="w-12 h-12 text-pink-400 fill-pink-400/20 drop-shadow-[0_0_15px_rgba(232,121,249,0.3)] animate-pulse" />
                    </div>

                    <p className="text-xl font-medium opacity-80">
                        {hostName} hosted a Zappy quiz!
                    </p>
                </div>

                {/* Podium */}
                <div className="flex-1 w-full flex justify-center items-end gap-4 mb-8">
                    {/* 2nd Place */}
                    {winners[1] && (
                        <div className="flex flex-col items-center">
                            <div className="mb-3 relative scale-90">
                                <AnimatedAvatar avatarId={winners[1].avatarId} size="md" />
                            </div>
                            <div className="text-center mb-2">
                                <p className="font-bold truncate max-w-[100px]">{winners[1].name}</p>
                            </div>
                            <div className="w-24 h-32 rounded-t-xl bg-gradient-to-b from-slate-400 to-slate-600 shadow-lg flex items-start justify-center pt-2 relative overflow-hidden">
                                <span className="text-4xl font-black text-white/20">2</span>
                            </div>
                        </div>
                    )}

                    {/* 1st Place */}
                    {winners[0] && (
                        <div className="flex flex-col items-center -mt-8 z-10">
                            <div className="mb-4 relative">
                                <AnimatedAvatar avatarId={winners[0].avatarId} size="lg" />
                            </div>
                            <div className="text-center mb-2">
                                <p className="font-bold text-xl truncate max-w-[140px] text-yellow-500">{winners[0].name}</p>
                                <div className="px-3 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 text-xs font-bold border border-yellow-500/30">
                                    {winners[0].score.toLocaleString()} pts
                                </div>
                            </div>
                            <div className="w-32 h-48 rounded-t-xl bg-gradient-to-b from-yellow-400 to-yellow-600 shadow-xl flex items-start justify-center pt-2 relative overflow-hidden ring-4 ring-yellow-500/20">
                                <span className="text-6xl font-black text-white/30 mt-4">1</span>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                            </div>
                        </div>
                    )}

                    {/* 3rd Place */}
                    {winners[2] && (
                        <div className="flex flex-col items-center">
                            <div className="mb-3 relative scale-90">
                                <AnimatedAvatar avatarId={winners[2].avatarId} size="md" />
                            </div>
                            <div className="text-center mb-2">
                                <p className="font-bold truncate max-w-[100px]">{winners[2].name}</p>
                            </div>
                            <div className="w-24 h-24 rounded-t-xl bg-gradient-to-b from-amber-600 to-amber-800 shadow-lg flex items-start justify-center pt-2 relative overflow-hidden">
                                <span className="text-4xl font-black text-white/20">3</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="w-full text-center py-6 border-t border-white/10 mt-auto">
                    <div className="flex flex-col items-center gap-2">
                        <p className="font-display font-bold text-lg tracking-wide">
                            Start your own game
                        </p>
                        <div className="px-4 py-1.5 bg-white text-black rounded-lg font-bold font-mono text-sm shadow-lg">
                            zappy.app
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

HostCard.displayName = 'HostCard';
