import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Share2, Loader2, Check } from 'lucide-react';
import { HostCard } from './HostCard';
import { PlayerCard } from './PlayerCard';
import { toPng } from 'html-to-image';
import download from 'downloadjs';
import { TitleType } from '../game/PlayerTitles';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'host' | 'player';
    data: {
        quizTitle?: string;
        // Host data
        hostName?: string;
        winners?: { name: string; avatarId: number; score: number }[];
        // Player data
        playerName?: string;
        avatarId?: number;
        score?: number;
        rank?: number;
        titles?: TitleType[];
        // Common
        totalPlayers: number;
    };
}

export function ShareModal({ isOpen, onClose, type, data }: ShareModalProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTheme, setActiveTheme] = useState<'dark' | 'light'>('dark');
    const [hasDownloaded, setHasDownloaded] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setHasDownloaded(false);
            setActiveTheme('dark');
        }
    }, [isOpen]);

    const handleDownload = async () => {
        if (!cardRef.current) return;

        try {
            setIsGenerating(true);

            // Wait a bit for fonts/images to be fully ready if needed
            await new Promise(resolve => setTimeout(resolve, 100));

            const dataUrl = await toPng(cardRef.current, {
                cacheBust: true,
                pixelRatio: 2, // High quality
            });

            download(dataUrl, `zappy-result-${Date.now()}.png`);
            setHasDownloaded(true);

            // Reset success state after 2 seconds
            setTimeout(() => setHasDownloaded(false), 2000);
        } catch (error) {
            console.error('Failed to generate image:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 bg-background/95 backdrop-blur-xl border-white/10 overflow-hidden">
                <DialogHeader className="p-6 border-b border-white/10 shrink-0 flex-row items-center justify-between">
                    <DialogTitle className="font-display text-2xl">Share Result</DialogTitle>

                    <div className="flex items-center gap-4 mr-8">
                        <Tabs value={activeTheme} onValueChange={(v) => setActiveTheme(v as 'dark' | 'light')}>
                            <TabsList>
                                <TabsTrigger value="dark">Dark Theme</TabsTrigger>
                                <TabsTrigger value="light">Light Theme</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto bg-black/50 flex items-center justify-center p-8 relative">
                    {/* Grid pattern background for preview area */}
                    <div className="absolute inset-0 z-0 opacity-20"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}
                    />

                    {/* Card Preview Wrapper - Scaled down to fit */}
                    <div className="relative z-10 scale-[0.6] sm:scale-[0.7] md:scale-[0.8] lg:scale-100 transition-transform origin-center shadow-2xl rounded-xl ring-1 ring-white/10">
                        {type === 'host' ? (
                            <HostCard
                                ref={cardRef}
                                quizTitle={data.quizTitle}
                                hostName={data.hostName || 'Host'}
                                totalPlayers={data.totalPlayers}
                                winners={data.winners || []}
                                theme={activeTheme}
                            />
                        ) : (
                            <PlayerCard
                                ref={cardRef}
                                quizTitle={data.quizTitle}
                                playerName={data.playerName || 'Player'}
                                avatarId={data.avatarId || 1}
                                score={data.score || 0}
                                rank={data.rank || 0}
                                totalPlayers={data.totalPlayers}
                                titles={data.titles}
                                theme={activeTheme}
                            />
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-white/10 bg-background/50 shrink-0 flex justify-end gap-4">
                    <Button variant="outline" onClick={onClose} disabled={isGenerating}>
                        Cancel
                    </Button>
                    <Button
                        size="lg"
                        className="neon-glow min-w-[160px]"
                        onClick={handleDownload}
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : hasDownloaded ? (
                            <>
                                <Check className="w-4 h-4 mr-2" />
                                Downloaded!
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" />
                                Download Image
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
