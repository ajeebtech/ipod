import React from 'react';
import { Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';

interface MiniPlayerProps {
    videoId: string;
    title: string;
    artist: string;
    progress: number;
    currentTime: number;
    duration: number;
    isPaused: boolean;
    onTogglePlay: () => void;
    onResume: () => void;
}

function CustomPlayIcon({ size = 24, fill = "currentColor" }: { size?: number, fill?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 256 256" fill={fill}>
            <rect width="256" height="256" fill="none" />
            <path d="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z" />
        </svg>
    );
}

// Format helper
const formatTime = (seconds: number) => {
    const m = Math.floor(Math.abs(seconds) / 60);
    const s = Math.floor(Math.abs(seconds) % 60);
    return `${seconds < 0 ? '-' : ''}${m}:${s.toString().padStart(2, '0')}`;
};

export default function MiniPlayer({
    videoId,
    title,
    artist,
    progress,
    currentTime,
    duration,
    isPaused,
    onTogglePlay,
    onResume
}: MiniPlayerProps) {
    return (
        <motion.div
            onClick={onResume}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] w-[300px] bg-white/90 backdrop-blur-xl rounded-2xl border border-black/5 p-2 shadow-xl flex items-center gap-3 cursor-pointer group"
            initial={{ opacity: 0, y: 200, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 200, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 280, damping: 20 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            {/* Info Section */}
            <div className="flex items-center gap-2.5 shrink-0">
                <div className="w-9 h-9 rounded-md overflow-hidden shrink-0 relative bg-gray-100 shadow-sm group-hover:shadow-md transition-shadow border border-black/5">
                    <img
                        src={`https://img.youtube.com/vi/${videoId}/default.jpg`}
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        alt="Album Art"
                    />
                    {/* Playing Indicator Overlay */}
                    {!isPaused && (
                        <div className="absolute inset-0 bg-white/30 flex items-end justify-center gap-[2px] pb-0.5 backdrop-blur-[0.5px]">
                            <div className="w-0.5 bg-black h-1.5 animate-[bounce_1s_infinite]" style={{ animationDelay: '0s' }} />
                            <div className="w-0.5 bg-black h-2.5 animate-[bounce_1.2s_infinite]" style={{ animationDelay: '0.1s' }} />
                            <div className="w-0.5 bg-black h-1 animate-[bounce_0.8s_infinite]" style={{ animationDelay: '0.2s' }} />
                        </div>
                    )}
                </div>
            </div>

            {/* Middle: Title & Artist (Flexible) */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                <div className="text-gray-900 text-[11px] font-bold truncate leading-tight tracking-tight">
                    {title || 'Loading...'}
                </div>
                <div className="text-gray-500 text-[9px] truncate font-medium">
                    {artist || 'Unknown Artist'}
                </div>
            </div>

            {/* Right: Controls & Progress */}
            <div className="flex items-center gap-2.5 shrink-0 pl-1 border-l border-black/5">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onTogglePlay();
                    }}
                    className="w-6 h-6 rounded-full bg-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-sm hover:shadow-md shrink-0"
                >
                    {isPaused ? (
                        <CustomPlayIcon size={10} fill="white" />
                    ) : (
                        <div className="flex gap-[2px]">
                            <div className="w-1 h-2 bg-white rounded-[0.5px]" />
                            <div className="w-1 h-2 bg-white rounded-[0.5px]" />
                        </div>
                    )}
                </button>

                <div className="hidden sm:flex flex-col gap-1 min-w-[60px]">
                    <div className="h-1 bg-black/5 rounded-full overflow-hidden w-full">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
