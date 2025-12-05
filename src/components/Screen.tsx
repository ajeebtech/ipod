'use client';

import React, { useState, useEffect, useRef } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { getYouTubeId } from '@/lib/youtube';
import { Battery } from 'lucide-react';

interface ScreenProps {
    view: 'menu' | 'player' | 'input';
    videoUrl?: string;
    menuItems: string[];
    selectedIndex: number;
    isPlaying: boolean;
    onUrlChange?: (url: string) => void;
    onBack?: () => void;
}

export function Screen({ view, videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', menuItems, selectedIndex, isPlaying, onUrlChange, onBack }: ScreenProps) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [duration, setDuration] = useState(0);
    const [playedSeconds, setPlayedSeconds] = useState(0);
    const [inputValue, setInputValue] = useState(videoUrl);
    const playerRef = useRef<any>(null);

    // Focus input when entering input view
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (view === 'input') {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [view]);

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    // Progress polling logic for YouTube player
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (view === 'player' && isPlaying && playerRef.current) {
            interval = setInterval(async () => {
                try {
                    const current = await playerRef.current.getCurrentTime();
                    const dur = await playerRef.current.getDuration();
                    setPlayedSeconds(current);
                    setDuration(dur);
                } catch (e) {
                    // Ignore errors if player is not ready
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [view, isPlaying]);

    useEffect(() => {
        if (playerRef.current) {
            if (isPlaying) playerRef.current.playVideo();
            else playerRef.current.pauseVideo();
        }
    }, [isPlaying]);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handlePlayerReady: YouTubeProps['onReady'] = (event) => {
        playerRef.current = event.target;
        setDuration(event.target.getDuration());
        if (isPlaying) event.target.playVideo();
    };

    const handleStateChange: YouTubeProps['onStateChange'] = (event) => {
        // Sync external playing state if needed, but we drive it from Ipod parent usually.
        // event.data: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued).
    };

    const videoId = getYouTubeId(videoUrl);

    return (
        <div className="w-[320px] h-[240px] bg-white border-2 border-slate-700 rounded-lg overflow-hidden relative shadow-inner">
            {/* Status Bar */}
            <div className="h-6 bg-gradient-to-b from-gray-200 to-gray-300 border-b border-gray-400 flex items-center justify-between px-2 text-[10px] font-semibold text-gray-800 absolute top-0 w-full z-10">
                <div className="flex items-center gap-1">
                    <PlayIcon isPlaying={isPlaying} />
                </div>
                <span>{formatTime(currentTime)}</span>
                <div className="flex items-center gap-1">
                    <Battery size={14} className="text-green-600" fill="currentColor" />
                </div>
            </div>

            <div className="mt-6 h-[calc(100%-24px)] flex">
                {view === 'menu' && (
                    <>
                        <div className="w-1/2 h-full bg-white flex flex-col">
                            <div className="bg-gradient-to-b from-blue-500 to-blue-600 text-white font-bold px-2 py-1 text-sm border-b border-blue-700 shadow-sm">
                                iPod
                            </div>
                            <ul className="flex-1 overflow-hidden">
                                {menuItems.map((item, index) => (
                                    <li
                                        key={index}
                                        className={`px-2 py-1 text-sm flex justify-between items-center cursor-default ${index === selectedIndex
                                            ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white font-semibold'
                                            : 'text-black'
                                            }`}
                                    >
                                        <span>{item}</span>
                                        <span className="text-xs opacity-70">›</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="w-1/2 h-full bg-slate-50 relative flex items-center justify-center">
                            {/* Preview or Graphic */}
                            <div className="text-gray-300">
                                <svg viewBox="0 0 24 24" width="64" height="64" stroke="currentColor" strokeWidth="1" fill="none">
                                    <path d="M9 18V5l12-2v13" />
                                    <circle cx="6" cy="18" r="3" />
                                    <circle cx="18" cy="16" r="3" />
                                </svg>
                            </div>
                        </div>
                    </>
                )}

                {view === 'player' && (
                    <div className="w-full h-full bg-black flex flex-col relative">
                        <div className="flex-1 flex items-center justify-center overflow-hidden">
                            {videoId ? (
                                <YouTube
                                    videoId={videoId}
                                    opts={{
                                        height: '240',
                                        width: '320',
                                        playerVars: {
                                            autoplay: isPlaying ? 1 : 0,
                                            controls: 0,
                                            disablekb: 1,
                                            modestbranding: 1,
                                            fs: 0,
                                            iv_load_policy: 3
                                        },
                                    }}
                                    onReady={handlePlayerReady}
                                    onStateChange={handleStateChange}
                                    className="w-full h-full"
                                    iframeClassName="w-full h-full object-cover pointer-events-none"
                                />
                            ) : (
                                <div className="text-white text-xs">Invalid Video URL</div>
                            )}
                        </div>

                        {/* Persistent Progress Bar Overlay */}
                        <div className="absolute bottom-0 w-full bg-black/80 backdrop-blur-sm p-2 flex flex-col gap-1 z-20">
                            <div className="w-full h-1.5 bg-gray-600 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                                    style={{ width: `${(playedSeconds / (duration || 1)) * 100}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-white font-medium px-1">
                                <span>{formatDuration(playedSeconds)}</span>
                                <span>-{formatDuration(Math.max(0, duration - playedSeconds))}</span>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'input' && (
                    <div className="w-full h-full bg-white flex flex-col p-4 items-center justify-start gap-4">
                        <h3 className="font-bold text-gray-800 text-sm mt-2">Enter YouTube URL</h3>
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded p-1 text-black outline-blue-500"
                            placeholder="https://youtu.be/..."
                        />
                        <div className="text-[10px] text-gray-500 text-center">
                            Press Center to Save
                        </div>
                        {/* Visual helper to show 'Select' triggers save */}
                        <button
                            onClick={() => onUrlChange?.(inputValue)}
                            className="hidden" // Handled by wheel select, but here for completeness if we wanted click
                        >Save</button>
                    </div>
                )}
            </div>
        </div>
    );
}

function PlayIcon({ isPlaying }: { isPlaying: boolean }) {
    if (isPlaying) {
        return (
            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="text-black">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
            </svg>
        )
    }
    return (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="text-black">
            <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
    );
}

function formatDuration(seconds: number) {
    const pad = (num: number) => num.toString().padStart(2, '0');
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${pad(secs)}`;
}
