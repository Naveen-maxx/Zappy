import React, { forwardRef } from 'react';
import { Zap, Target, Award, Hash, Timer, Sparkles } from 'lucide-react';
import { AnimatedAvatar } from '../game/AnimatedAvatar';
import { cn } from '@/lib/utils';
import { TitleBadge, TitleType } from '../game/PlayerTitles';

interface PlayerCardProps {
    quizTitle?: string;
    playerName: string;
    avatarId: number;
    score: number;
    rank: number;
    totalPlayers: number;
    titles?: TitleType[];
    theme?: 'dark' | 'light';
}

export const PlayerCard = forwardRef<HTMLDivElement, PlayerCardProps>(({
    quizTitle = 'Live Quiz',
    playerName,
    avatarId,
    score,
    rank,
    totalPlayers,
    titles = [],
    theme = 'dark'
}, ref) => {
    const isDark = theme === 'dark';

    return (
        <div
            ref={ref}
            className={cn(
                "w-[600px] h-[850px] relative overflow-hidden flex flex-col p-8 pb-10",
                isDark ? "bg-[#09090B] text-white" : "bg-white text-zinc-900"
            )}
        >
            {/* Background Elements */}
            <div className="absolute inset-0 z-0">
                <div className={`absolute top-0 right-0 w-full h-full bg-gradient-to-bl ${isDark ? 'from-blue-900/30 via-slate-900 to-cyan-900/20' : 'from-blue-50 via-white to-cyan-50'}`} />
                {/* Neon lines */}
                <div className="absolute top-[20%] -left-[10%] w-[120%] h-[300px] bg-blue-500/10 -rotate-12 blur-3xl opacity-50" />
                <div className="absolute bottom-[20%] -right-[10%] w-[100%] h-[300px] bg-cyan-500/10 rotate-12 blur-3xl opacity-50" />

                {/* Tech grid texture */}
                <div className="absolute inset-0 opacity-[0.05]" style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, ${isDark ? 'white' : 'black'} 1px, transparent 0)`,
                    backgroundSize: `24px 24px`
                }}></div>
            </div>

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col">
                {/* Header */}
                <div className="w-full flex justify-between items-center mb-8">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="Zappy" className="w-10 h-10 rounded-xl shadow-lg" />
                        <span className="font-display text-2xl font-bold tracking-tight">Zappy</span>
                    </div>
                    <span className="font-display font-bold text-sm tracking-widest uppercase text-blue-400">
                        Think. Tap. Win.
                    </span>
                </div>

                {/* Hero Section */}
                <div className="flex-1 flex flex-col items-center justify-start pt-4">
                    <div className="relative mb-6 group">
                        <div className="absolute inset-0 bg-blue-500/20 blur-[60px] rounded-full group-hover:bg-blue-500/30 transition-all duration-500" />
                        <div className="relative scale-150 transform transition-transform duration-500 hover:scale-[1.6]">
                            <AnimatedAvatar avatarId={avatarId} size="lg" />
                        </div>
                        {rank <= 3 && (
                            <div className="absolute -top-6 -right-6 bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-950 font-black text-xl w-12 h-12 flex items-center justify-center rounded-full shadow-lg border-4 border-white transform rotate-12 z-20">
                                #{rank}
                            </div>
                        )}
                    </div>

                    <h1 className="font-display text-4xl font-black mb-2 text-center tracking-tight">
                        {playerName}
                    </h1>

                    <div className="flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                        <Sparkles className="w-4 h-4 text-yellow-400" />
                        <span className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-zinc-600")}>
                            I scored big on Zappy! ⚡
                        </span>
                    </div>

                    <div className="relative w-full max-w-sm transform hover:scale-[1.02] transition-transform duration-300">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-400 blur-xl opacity-20 rounded-[2rem]" />
                        <div className={cn(
                            "relative border backdrop-blur-2xl rounded-[2rem] p-10 text-center shadow-2xl overflow-hidden",
                            isDark ? "bg-zinc-900/80 border-white/10" : "bg-white/80 border-zinc-200"
                        )}>
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 opacity-50" />
                            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-400 mb-2">Final Score</p>
                            <div className={cn(
                                "font-mono text-8xl font-black tracking-tighter tabular-nums",
                                isDark ? "text-white" : "text-zinc-900"
                            )}>
                                {score.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats & Badges */}
                <div className="space-y-6 mb-8 mt-4">
                    {/* Stats Row */}
                    <div className="flex gap-4 justify-center">
                        <div className={cn("flex-1 p-3 rounded-2xl border flex flex-col items-center justify-center gap-1", isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-zinc-200")}>
                            <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Result</p>
                            <p className="text-lg font-bold flex items-center gap-2">
                                {rank <= 3 ? (rank === 1 ? '🥇 Champion' : '🥈 Podium') : '🎯 Qualified'}
                            </p>
                        </div>
                        <div className={cn("flex-1 p-3 rounded-2xl border flex flex-col items-center justify-center gap-1", isDark ? "bg-white/5 border-white/10" : "bg-zinc-50 border-zinc-200")}>
                            <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Rank</p>
                            <p className="text-lg font-bold">
                                {rank} <span className="text-xs opacity-50">/ {totalPlayers}</span>
                            </p>
                        </div>
                    </div>

                    {/* Badges */}
                    {titles.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2">
                            {titles.map(title => (
                                <TitleBadge key={title} titleType={title} size="md" />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="w-full text-center py-6 border-t border-white/10 mt-auto">
                    <div className="space-y-2">
                        <p className="font-display font-bold text-xl flex items-center justify-center gap-2">
                            Think you can beat me? <span className="text-2xl">😏</span>
                        </p>
                        <div className="inline-block px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-bold shadow-lg shadow-blue-500/20">
                            Play now at zappy
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
});

PlayerCard.displayName = 'PlayerCard';
