'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import YouTube, { YouTubePlayer } from 'react-youtube';
import { Play, Link2, SkipBack, SkipForward, Trash2, Film, Rewind, FastForward, Battery, Heart, ChevronDown, ChevronUp, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, SignInButton, UserButton, SignIn } from "@clerk/nextjs";
import { supabase } from '../lib/supabase';
import { fetchPlaylistItems } from '../lib/youtube-api';

// --- Icons ---

function CustomPlayIcon({ size = 24, fill = "currentColor" }: { size?: number, fill?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 256 256" fill={fill}>
            <rect width="256" height="256" fill="none" />
            <path d="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z" />
        </svg>
    );
}

function CustomPauseIcon({ size = 24, fill = "currentColor" }: { size?: number, fill?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 256 256" fill={fill}>
            <rect width="256" height="256" fill="none" />
            <path d="M216,48V208a16,16,0,0,1-16,16H160a16,16,0,0,1-16-16V48a16,16,0,0,1,16-16h40A16,16,0,0,1,216,48ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Z" />
        </svg>
    );
}

function CustomPlaylistIcon({ size = 24, className = "" }: { size?: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 256 256" className={className} fill="currentColor">
            <rect width="256" height="256" fill="none" />
            <line x1="40" y1="64" x2="216" y2="64" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
            <line x1="40" y1="128" x2="136" y2="128" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
            <line x1="40" y1="192" x2="136" y2="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
            <polygon points="240 160 176 200 176 120 240 160" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
        </svg>
    );
}

// --- Artificial Delay Helper ---

function createDelayResource(ms: number) {
    let status = 'pending';
    let promise: Promise<void> | null = null;

    return {
        read() {
            if (status === 'pending') {
                if (!promise) {
                    promise = new Promise((resolve) => setTimeout(resolve, ms)).then(() => {
                        status = 'success';
                    });
                }
                throw promise;
            }
        }
    };
}

const DelayWaiter = ({ resource }: { resource: { read: () => void } }) => {
    resource.read();
    return null;
};

function LoadingState() {
    return (
        <Html center>
            <div className="loader-container">
                <style>{`
                    .loader-container {
                        pointer-events: none;
                        user-select: none;
                    }
                    .wrapper {
                        width: 200px;
                        height: 60px;
                        position: relative;
                        z-index: 1;
                    }
                    .circle {
                        width: 20px;
                        height: 20px;
                        position: absolute;
                        border-radius: 50%;
                        background-color: #000;
                        left: 15%;
                        transform-origin: 50%;
                        animation: circle7124 .5s alternate infinite ease;
                    }
                    @keyframes circle7124 {
                        0% {
                            top: 60px;
                            height: 5px;
                            border-radius: 50px 50px 25px 25px;
                            transform: scaleX(1.7);
                        }
                        40% {
                            height: 20px;
                            border-radius: 50%;
                            transform: scaleX(1);
                        }
                        100% {
                            top: 0%;
                        }
                    }
                    .circle:nth-child(2) {
                        left: 45%;
                        animation-delay: .2s;
                    }
                    .circle:nth-child(3) {
                        left: auto;
                        right: 15%;
                        animation-delay: .3s;
                    }
                    .shadow {
                        width: 20px;
                        height: 4px;
                        border-radius: 50%;
                        background-color: rgba(0,0,0,0.5);
                        position: absolute;
                        top: 62px;
                        transform-origin: 50%;
                        z-index: -1;
                        left: 15%;
                        filter: blur(1px);
                        animation: shadow046 .5s alternate infinite ease;
                    }
                    @keyframes shadow046 {
                        0% {
                            transform: scaleX(1.5);
                        }
                        40% {
                            transform: scaleX(1);
                            opacity: .7;
                        }
                        100% {
                            transform: scaleX(.2);
                            opacity: .4;
                        }
                    }
                    .shadow:nth-child(4) {
                        left: 45%;
                        animation-delay: .2s
                    }
                    .shadow:nth-child(5) {
                        left: auto;
                        right: 15%;
                        animation-delay: .3s;
                    }
                `}</style>
                <div className="wrapper">
                    <div className="circle" />
                    <div className="circle" />
                    <div className="circle" />
                    <div className="shadow" />
                    <div className="shadow" />
                    <div className="shadow" />
                </div>
            </div>
        </Html>
    );
}

// --- Components ---

function Model() {
    const { scene } = useGLTF('/ipod_classic.glb');
    return (
        <group>
            <primitive object={scene} scale={1} />
        </group>
    );
}

interface ScreenOverlayProps {
    videoId: string | null;
    title?: string;
    index: number;
    total: number;
    onPlayerReady: (target: any) => void;
    onStateChange: (event: any) => void;
    playingSource: 'From URL' | 'History' | 'Liked Songs';
    isLiked: boolean;
    onToggleLike: () => void;
    user: any;
    likedSongs: any[];
    onPlay: (song: any) => void;
    onUnlike: (song: any) => void;

    onGoHome: () => void;
    channelName?: string;
    lastPlayed?: any;
    onResume?: () => void;
}

function ScreenOverlay({ videoId, title, index, total, onPlayerReady, onStateChange, playingSource, isLiked, onToggleLike, user, likedSongs, onPlay, onUnlike, onGoHome, channelName, lastPlayed, onResume }: ScreenOverlayProps) {
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [view, setView] = useState<'home' | 'liked_songs'>('home');
    const playerRef = useRef<YouTubePlayer | null>(null);

    // --- Format Helper ---
    const formatTime = (seconds: number) => {
        const m = Math.floor(Math.abs(seconds) / 60);
        const s = Math.floor(Math.abs(seconds) % 60);
        return `${seconds < 0 ? '-' : ''}${m}:${s.toString().padStart(2, '0')}`;
    };

    // --- Artist/Title splitting logic ---
    let displayTitle = title || "No Title";
    let displayArtist = "Unknown Artist";
    if (title) {
        // Common separator patterns: "Artist - Title", "Artist – Title", "Artist | Title"
        const parts = title.split(/[-–|]/);
        if (parts.length >= 2) {
            displayArtist = parts[0].trim();
            // Join the rest back in case title had hyphens
            displayTitle = parts.slice(1).join('-').trim();
        } else {
            // Fallback: Use channel name? We don't have it here. 
            // Just use "YouTube" for artist if we can't parse it?
            // Or just leave artist blank? Let's default to "YouTube Music" style
            // Fallback: Use channel name from prop if available, otherwise "YouTube"
            displayArtist = channelName || "YouTube";
        }
    } else {
        // Even if title is missing (shouldn't happen often), default artist to channel if available
        displayArtist = channelName || "YouTube";
    }

    useEffect(() => {
        const interval = setInterval(() => {
            if (playerRef.current && playerRef.current.getCurrentTime && playerRef.current.getDuration) {
                const current = playerRef.current.getCurrentTime();
                const dur = playerRef.current.getDuration();
                if (dur > 0) {
                    setProgress((current / dur) * 100);
                    setCurrentTime(current);
                    setDuration(dur);
                }
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // --- Spacebar Key Handler ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent scrolling
                if (playerRef.current && playerRef.current.getPlayerState) {
                    const state = playerRef.current.getPlayerState();
                    if (state === 1) { // Playing
                        playerRef.current.pauseVideo();
                    } else if (state === 2 || state === 5 || state === -1) { // Paused / Cued / Unstarted
                        playerRef.current.playVideo();
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleInternalPlayerReady = (event: any) => {
        playerRef.current = event.target;
        onPlayerReady(event.target);
    };

    // --- Renders ---

    // 1. Menu View (Default when no video)
    if (!videoId) {
        return (
            <Html
                transform
                occlude="blending"
                zIndexRange={[100, 0]}
                position={[0.015, 0.05, 0.00]}
                rotation={[-0.10, 1.57, 0.10]}
                scale={0.011}
                style={{
                    width: '320px',
                    height: '240px',
                    pointerEvents: 'none',
                }}
            >
                <div className="w-full h-full bg-white border-2 border-black rounded-[4px] relative flex font-sans overflow-hidden box-border shadow-inner pointer-events-auto">
                    {view === 'home' ? (
                        <div className="w-full h-full flex font-sans">
                            {/* Left: Custom Home Content */}
                            <div className="w-1/2 h-full bg-white flex flex-col border-r border-[#e0e0e0]">
                                <div className="h-6 bg-gradient-to-b from-[#5c9ae6] to-[#407ad6] flex items-center justify-center shadow-sm shrink-0 z-10 border-b border-[#2a5caa]">
                                    <span className="text-[12px] font-bold text-white drop-shadow-sm">iPod</span>
                                </div>
                                <div className="flex-1 flex flex-col py-2">
                                    <div className="px-2 mb-2">
                                        <p className="text-[11px] font-semibold text-black leading-tight text-center">
                                            What do you want to listen to?
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => setView('liked_songs')}
                                        className="w-full bg-gradient-to-b from-[#5c9ae6] to-[#407ad6] text-white px-3 py-1 text-[11px] flex justify-between items-center font-semibold"
                                    >
                                        <span>Liked Songs</span>
                                        <span className="text-[10px]">›</span>
                                    </button>
                                </div>
                            </div>

                            {/* Right: Graphic / Preview */}
                            <div className="w-1/2 h-full bg-[#f2f2f2] relative flex items-center justify-center overflow-hidden">
                                {lastPlayed ? (
                                    <button
                                        onClick={onResume}
                                        className="relative w-full h-full flex flex-col items-center justify-center pointer-events-auto hover:opacity-90 transition-opacity"
                                    >
                                        <div className="mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest scale-90">
                                            Last Played
                                        </div>
                                        <div
                                            className="w-full flex flex-col items-center justify-center"
                                            style={{
                                                transform: 'perspective(600px) rotateY(-25deg) scale(1) translateX(-5px) translateY(5px)',
                                                transformStyle: 'preserve-3d'
                                            }}
                                        >
                                            {/* Main Album Art */}
                                            <div className="w-32 aspect-square relative z-10 shadow-xl border border-white/20">
                                                <img
                                                    src={`https://img.youtube.com/vi/${lastPlayed.id}/hqdefault.jpg`}
                                                    alt="Album Art"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>

                                            {/* Reflection */}
                                            <div className="w-32 h-16 relative overflow-hidden mt-1">
                                                <img
                                                    src={`https://img.youtube.com/vi/${lastPlayed.id}/hqdefault.jpg`}
                                                    alt="Reflection"
                                                    className="w-full aspect-square object-cover scale-y-[-1] opacity-60 blur-[1px]"
                                                    style={{ maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 100%)', WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 100%)' }}
                                                />
                                            </div>
                                        </div>
                                    </button>
                                ) : (
                                    <div className="relative w-20 h-20 opacity-10">
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-black">
                                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                        </svg>
                                    </div>
                                )}
                                <div className="absolute top-1 right-2">
                                    <Battery size={14} fill="#4ade80" className="text-gray-600" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col bg-white">
                            <div className="h-8 bg-gradient-to-b from-[#f8f8f8] to-[#e0e0e0] flex items-center px-2 border-b border-[#c0c0c0] shadow-sm shrink-0">
                                <button
                                    onClick={() => setView('home')}
                                    className="mr-2 p-1 hover:bg-black/5 rounded-full"
                                >
                                    <ChevronDown size={16} className="rotate-90 text-gray-600" />
                                </button>
                                <span className="text-xs font-bold text-gray-800">Liked Songs</span>
                                <span className="ml-auto text-[10px] text-gray-500 font-medium">{likedSongs.length} Songs</span>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {likedSongs.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                                        <Heart size={32} className="mb-2 opacity-20" />
                                        <p className="text-xs">No liked songs yet</p>
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-gray-100">
                                        {likedSongs.map((song) => (
                                            <li key={song.id} className="flex items-center gap-2 p-2 hover:bg-blue-50 transition-colors group">
                                                <button
                                                    onClick={() => onPlay(song)}
                                                    className="flex-1 flex flex-col text-left min-w-0"
                                                >
                                                    <span className="text-xs font-semibold text-gray-800 truncate leading-snug">{song.title}</span>
                                                    <span className="text-[9px] text-gray-500">
                                                        {song.duration ? formatTime(song.duration) : '--:--'}
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onUnlike(song); }}
                                                    className="p-1.5 hover:bg-red-50 rounded-full transition-colors group/heart"
                                                >
                                                    {/* Ideally pass specific song ID to toggle like, but for now just visual or playing */}
                                                    <Heart size={14} className="fill-red-500 text-red-500 group-hover/heart:text-red-600" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </Html>
        );
    }

    // 2. Now Playing View
    return (
        <Html
            transform
            occlude="blending"
            zIndexRange={[100, 0]}
            position={[0.015, 0.05, 0.00]}
            rotation={[-0.10, 1.57, 0.10]}
            scale={0.011}
            style={{
                width: '320px',
                height: '240px',
                pointerEvents: 'none',
            }}
        >
            <div className="w-full h-full bg-white border-2 border-black rounded-[4px] relative flex flex-col font-sans overflow-hidden box-border shadow-inner">
                {/* Header: 'Now Playing' */}
                {/* Header: 'Now Playing' */}
                <div className="h-6 bg-gradient-to-b from-[#fdffff] to-[#cbe9fe] flex items-center px-1 shadow-sm shrink-0 z-10 border-b border-[#95aec5] relative">
                    {/* Left: Blue Home Button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onGoHome(); }}
                        className="flex items-center pointer-events-auto hover:opacity-75 transition-opacity"
                        title="Home"
                    >
                        <Home size={12} fill="#3b82f6" className="text-[#2563eb]" />
                    </button>

                    {/* Center: Title */}
                    <div className="absolute left-1/2 -translate-x-1/2 text-[11px] font-semibold text-black drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]">
                        Now Playing
                    </div>

                    {/* Right: Green Battery */}
                    <div className="ml-auto">
                        <Battery size={16} fill="#4ade80" className="text-gray-600" />
                    </div>
                </div>

                {/* Main Split Content */}
                <div className="flex-1 flex min-h-0 bg-white">
                    {/* Left: Album Art / Video */}
                    <div className="w-[140px] h-full bg-white relative shrink-0 border-r border-[#d1d5db] flex items-center justify-center overflow-hidden">
                        {/* 3D Wrapper */}
                        <div
                            className="w-full flex flex-col"
                            style={{
                                transform: 'perspective(600px) rotateY(25deg) scale(0.85) translateX(8px) translateY(24px)',
                                transformStyle: 'preserve-3d'
                            }}
                        >
                            {/* Main Album Art */}
                            <div className="w-full aspect-square relative z-10 shadow-xl">
                                <img
                                    src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                                    alt="Album Art"
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Reflection */}
                            <div className="w-full h-16 relative overflow-hidden mt-1">
                                <img
                                    src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                                    alt="Reflection"
                                    className="w-full aspect-square object-cover scale-y-[-1] opacity-50 blur-[1px]"
                                    style={{ maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%)', WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%)' }}
                                />
                            </div>
                        </div>

                        {/* Hidden Player for Audio Only */}
                        <div className="absolute top-0 left-0 w-1 h-1 opacity-0 pointer-events-none overflow-hidden z-0">
                            <YouTube
                                videoId={videoId}
                                onReady={handleInternalPlayerReady}
                                onStateChange={onStateChange}
                                opts={{
                                    width: '100%',
                                    height: '100%',
                                    playerVars: {
                                        autoplay: 1,
                                        controls: 0,
                                        fs: 0,
                                        modestbranding: 1,
                                        rel: 0,
                                        disablekb: 1,
                                        showinfo: 0,
                                        iv_load_policy: 3
                                    },
                                }}
                            />
                        </div>
                    </div>

                    {/* Right: Info */}
                    <div className="flex-1 p-3 flex flex-col justify-center min-w-0 bg-[#f8f9fa]">
                        <h1 className="text-sm font-bold text-[#1a1a1a] leading-tight line-clamp-3 mb-1 tracking-tight">
                            {displayTitle}
                        </h1>
                        <h2 className="text-[11px] font-semibold text-[#555] truncate">
                            {displayArtist}
                        </h2>
                        <h3 className="text-[10px] text-[#888] truncate mb-auto mt-0.5">
                            {/* Placeholder for Album */}
                            {playingSource}
                        </h3>

                        <div className="mt-2 flex items-center justify-between">
                            <div className="text-[9px] text-[#666] font-medium tracking-wide">
                                {index} of {total}
                            </div>
                            <div className="flex gap-1 pointer-events-auto items-center">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onToggleLike(); }}
                                    className="p-1.5 hover:scale-110 active:scale-95 transition-transform group"
                                    title={isLiked ? "Remove from Liked" : "Add to Liked"}
                                >
                                    <Heart
                                        size={18}
                                        className={`transition-colors ${isLiked ? "fill-red-500 text-red-500" : "text-[#888] group-hover:text-[#666]"}`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom: Progress Bar */}
                <div className="h-8 bg-[#f8f9fa] px-3 flex flex-col justify-center shrink-0 border-t border-[#e5e7eb]">
                    <div className="w-full h-1.5 bg-[#d1d5db] rounded-sm overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]">
                        <div
                            className="h-full bg-gradient-to-r from-[#6ba4ef] to-[#407ad6] shadow-sm relative"
                            style={{ width: `${progress}%` }}
                        >
                            {/* Little shine at the end */}
                            <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-white/50" />
                        </div>
                    </div>
                    <div className="flex justify-between text-[8px] mt-0.5 font-semibold text-[#666]">
                        <span>{formatTime(currentTime)}</span>
                        <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
                    </div>
                </div>
            </div>
        </Html>
    );
}



export function Ipod3D() {
    const { user, isLoaded, isSignedIn } = useUser();
    const [videoUrl, setVideoUrl] = useState('');
    const [history, setHistory] = useState<{ id: string; url: string; title: string; dbId?: number; fromPlaylist?: boolean; playlistId?: string; playlistTitle?: string; channel?: string }[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasStarted, setHasStarted] = useState(true);
    const [isHistoryOpen, setIsHistoryOpen] = useState(true);

    const [dontAskAgain, setDontAskAgain] = useState(false);
    const [playingSource, setPlayingSource] = useState<'From URL' | 'History' | 'Liked Songs'>('History');
    const [isLiked, setIsLiked] = useState(false);
    const [queue, setQueue] = useState<any[]>([]);
    const [likedSongs, setLikedSongs] = useState<any[]>([]);

    // Artificial delay resource to ensure loading screen is visible for at least 3 seconds
    const [delayResource] = useState(() => createDelayResource(3000));

    // Player ref
    const playerRef = useRef<YouTubePlayer | null>(null);

    const currentVideoId = currentIndex >= 0 && queue[currentIndex] ? queue[currentIndex].id : null;

    useEffect(() => {
        const skipStart = localStorage.getItem('ipod-skip-start');
        if (skipStart === 'true') {
            setHasStarted(true);
        }
    }, []);

    // Auto-scroll logic for history
    const historyContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (historyContainerRef.current) {
            // Find the active element purely by DOM attribute, ignoring index complexity (groups/reverse)
            const activeItem = historyContainerRef.current.querySelector('[data-active="true"]');
            if (activeItem) {
                activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, [currentIndex, history]);

    useEffect(() => {
        if (isSignedIn && user) {
            const fetchHistory = async () => {
                const { data, error } = await supabase
                    .from('history')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: true });

                if (data) {
                    const mappedHistory = data.map((item: any) => {
                        // Priority: DB columns -> URL param fallback
                        let playlistId = item.playlist_id;
                        let playlistTitle = item.playlist_title;

                        if (!playlistId) {
                            const listMatch = item.url.match(/[?&]list=([^#&?]+)/);
                            playlistId = listMatch ? listMatch[1] : undefined;
                        }

                        // Default title if still missing (but we have an ID)
                        if (playlistId && !playlistTitle) {
                            playlistTitle = 'Playlist';
                        }

                        return {
                            id: item.video_id,
                            url: item.url,
                            title: item.title,
                            dbId: item.id,
                            fromPlaylist: !!playlistId,
                            playlistId: playlistId,
                            playlistTitle: playlistTitle
                        };
                    });
                    if (mappedHistory.length > 0) {
                        setHistory(mappedHistory);
                        // Default to history queue on load if empty, or sync logic
                        setQueue((prev) => prev.length === 0 ? mappedHistory : prev);

                        setHasStarted(true);
                        setCurrentIndex((prev) => prev === -1 ? mappedHistory.length - 1 : prev);
                    }
                }
            };
            fetchHistory();
        }
    }, [isSignedIn, user]);

    // Check if current video is liked
    useEffect(() => {
        const checkLikedStatus = async () => {
            if (!isSignedIn || !user || currentIndex < 0 || !queue[currentIndex]) {
                setIsLiked(false);
                return;
            }
            const currentItem = queue[currentIndex];
            const { data } = await supabase
                .from('liked_songs')
                .select('id')
                .eq('user_id', user.id)
                .eq('video_id', currentItem.id)
                .single();

            setIsLiked(!!data);
        };

        checkLikedStatus();
        checkLikedStatus();
    }, [currentIndex, queue, isSignedIn, user]);

    // Fetch all Liked Songs for the list
    useEffect(() => {
        if (isSignedIn && user) {
            const fetchLikedSongs = async () => {
                const { data } = await supabase
                    .from('liked_songs')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });
                if (data) setLikedSongs(data);
            };
            fetchLikedSongs();
        }
    }, [isSignedIn, user, isLiked]); // Refetch when isLiked changes (to sync list)

    const handlePlayerReady = (player: YouTubePlayer) => {
        playerRef.current = player;
        if (player.getPlayerState() !== 1) {
            player.playVideo();
        }
    };

    const handleStateChange = async (event: any) => {
        if (event.data === 1) setIsPlaying(true);
        if (event.data === 2) setIsPlaying(false);
        if (event.data === 0) {
            setIsPlaying(false);
            setIsPlaying(false);
            // Only auto-play if the next item is from a playlist OR we are in a valid queue
            // Logic update: If in Liked Songs queue, always play next.
            // If in history/playlist mode...
            if (currentIndex < queue.length - 1) {
                const nextItem = queue[currentIndex + 1];
                // If playing from history (where queue==history), we respect 'fromPlaylist' flag to auto-continue?
                // Original logic: if (nextItem && nextItem.fromPlaylist)
                // But for Liked Songs, we want to auto-continue regardless.

                // If playingSource is 'Liked Songs', auto-play.
                // If 'History' or 'From URL', respect standard logic (only playlist)
                if (playingSource === 'Liked Songs' || (nextItem && nextItem.fromPlaylist)) {
                    playNext();
                }
            }
        }

        const player = event.target;
        if (player && player.getVideoData && isSignedIn && user && currentIndex >= 0) {
            const data = player.getVideoData();
            const currentItem = queue[currentIndex];

            if (data && (data.title || data.author) && currentItem) {
                const titleChanged = data.title && (currentItem.title === 'Loading title...' || currentItem.title !== data.title);
                const channelChanged = data.author && currentItem.channel !== data.author;

                if (titleChanged || channelChanged) {
                    // Update Queue item
                    setQueue(prev => {
                        const newQueue = [...prev];
                        newQueue[currentIndex] = {
                            ...newQueue[currentIndex],
                            title: data.title || newQueue[currentIndex].title,
                            channel: data.author || newQueue[currentIndex].channel
                        };
                        return newQueue;
                    });

                    // ALSO Update History if it's the same item (synced)
                    // This is a bit tricky if they are desynced. 
                    // We'll rely on DB ID if present.

                    if (currentItem.dbId) {
                        await supabase
                            .from('history')
                            .update({ title: data.title })
                            .eq('id', currentItem.dbId);

                        // Optimistically update history state too for UI consistency
                        setHistory(prev => prev.map(h => h.dbId === currentItem.dbId ? {
                            ...h,
                            title: data.title || h.title,
                            channel: data.author || h.channel
                        } : h));
                    }
                }
            }
        }
    };


    const savePreference = () => {
        if (dontAskAgain) {
            localStorage.setItem('ipod-skip-start', 'true');
        }
    };

    const handleConfirm = async () => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const listRegExp = /[?&]list=([^#&?]+)/;

        const match = videoUrl.match(regExp);
        const listMatch = videoUrl.match(listRegExp);

        if (listMatch && listMatch[1]) {
            // It's a playlist!
            savePreference();
            const playlistId = listMatch[1];
            const playlistItems = await fetchPlaylistItems(playlistId);

            if (playlistItems.items.length > 0) {
                const newIds = new Set(playlistItems.items.map((i: any) => i.id));

                let dbItems: any[] = [];
                if (isSignedIn && user) {
                    // Delete existing entries for these videos
                    await supabase
                        .from('history')
                        .delete()
                        .eq('user_id', user.id)
                        .in('video_id', Array.from(newIds));

                    // Insert new entries
                    const itemsToInsert = playlistItems.items.map((item: any) => ({
                        user_id: user.id,
                        video_id: item.id,
                        url: item.url,
                        title: item.title,
                        playlist_id: playlistId,
                        playlist_title: playlistItems.title
                    }));

                    const { data } = await supabase.from('history').insert(itemsToInsert).select();
                    if (data) dbItems = data;
                }

                setHistory(prev => {
                    const filtered = prev.filter(item => !newIds.has(item.id));
                    const newHistoryItems = playlistItems.items.map((item: any) => {
                        const dbItem = dbItems.find((d: any) => d.video_id === item.id);
                        return {
                            id: item.id,
                            url: item.url,
                            title: item.title,
                            dbId: dbItem?.id,
                            fromPlaylist: true,
                            playlistId: playlistId,
                            playlistTitle: playlistItems.title
                        };
                    });

                    const nextHistory = [...filtered, ...newHistoryItems];

                    // UPDATE QUEUE TO MATCH HISTORY HERE
                    setQueue(nextHistory);

                    let jumpIndex = nextHistory.length - newHistoryItems.length; // Start of new items
                    if (match && match[2] && match[2].length === 11) {
                        const specificId = match[2];
                        const specificIndex = nextHistory.findIndex(h => h.id === specificId);
                        if (specificIndex !== -1) jumpIndex = specificIndex;
                    }

                    setCurrentIndex(jumpIndex);
                    return nextHistory;
                });

                setVideoUrl('');
                setHasStarted(true);
                setPlayingSource('From URL');
                return;
            } else {
                alert("Could not load playlist. Check your API Key or URL.");
                console.error("Playlist items were empty.");
            }
        }

        if (match && match[2].length === 11) {
            savePreference();
            const newId = match[2];
            const title = 'Loading title...';

            let dbId: number | undefined;
            if (isSignedIn && user) {
                // Remove existing entry if it exists to treat this as "latest"
                await supabase
                    .from('history')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('video_id', newId);

                const { data, error } = await supabase
                    .from('history')
                    .insert([
                        { user_id: user.id, video_id: newId, url: videoUrl, title: title }
                    ])
                    .select();
                if (data && data[0]) dbId = data[0].id;
            }

            setHistory(prev => {
                const filtered = prev.filter(item => item.id !== newId);
                const newItem = { id: newId, url: videoUrl, title: title, dbId: dbId, fromPlaylist: false };
                const nextHistory = [...filtered, newItem];

                // UPDATE QUEUE TO MATCH HISTORY
                setQueue(nextHistory);

                setCurrentIndex(nextHistory.length - 1);
                return nextHistory;
            });

            setVideoUrl('');
            setHasStarted(true);
            setPlayingSource('From URL');
        }
    };

    const handleSkip = () => {
        savePreference();
        setHasStarted(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleConfirm();
    };

    const togglePlayPause = () => {
        if (playerRef.current) {
            if (isPlaying) playerRef.current.pauseVideo();
            else playerRef.current.playVideo();
        }
    };

    const handleSeek = (seconds: number) => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
            const currentTime = playerRef.current.getCurrentTime();
            playerRef.current.seekTo(currentTime + seconds, true);
        }
    };

    const playNext = () => {
        if (currentIndex < queue.length - 1) setCurrentIndex(prev => prev + 1);
    };

    const playPrev = () => {
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    };

    const playHistoryItem = async (index: number) => {
        // Playing from the Sidebar (History)

        // 1. Ensure we are in History Mode (Queue = History)
        // Note: index passed here is likely based on 'history' array rendering
        // So we must be careful if queue != history.

        // Let's reset queue to history.
        // BUT wait, playHistoryItem does re-ordering (bumping to top).

        const selectedItem = history[index];
        if (!selectedItem) return;

        // Bump to top (end of array)
        setHistory(prev => {
            let itemsToMove: typeof prev = [];
            let remainingItems: typeof prev = [];

            if (selectedItem.fromPlaylist && selectedItem.playlistId) {
                // Move entire playlist group
                itemsToMove = prev.filter(item => item.playlistId === selectedItem.playlistId);
                remainingItems = prev.filter(item => item.playlistId !== selectedItem.playlistId);
            } else {
                // Move single item
                itemsToMove = [selectedItem];
                remainingItems = prev.filter(item => item.id !== selectedItem.id);
            }

            // New history: [Old items ..., Moved Items]
            // Since we display REVERSED, Moved Items will appear at TOP.
            const newHistory = [...remainingItems, ...itemsToMove];

            // Set Queue to this new reordered history
            setQueue(newHistory);

            // Recalculate index relative to the new list
            // We want to play the *first* item of the moved group (or the single item)
            // which is now at: length - itemsToMove.length
            const newIndex = remainingItems.length; // Start of the appended group

            setCurrentIndex(newIndex);
            setHasStarted(true);

            return newHistory;
        });

        // Update DB timestamp to persist order
        if (isSignedIn && user) {
            const timestamp = new Date().toISOString();
            if (selectedItem.fromPlaylist && selectedItem.playlistId) {
                await supabase.from('history')
                    .update({ created_at: timestamp })
                    .eq('user_id', user.id)
                    .eq('playlist_id', selectedItem.playlistId);
            } else if (selectedItem.dbId) {
                await supabase.from('history')
                    .update({ created_at: timestamp })
                    .eq('id', selectedItem.dbId);
            }
        } else {
            // If not persistent, just start
            setHasStarted(true);
            setCurrentIndex(index); // Fallback if bump fails (unlikely)
        }
        setPlayingSource('History');
    };

    const handlePlayFromLiked = async (song: any) => {
        // Set context to Liked Songs
        // This is a separate queue now.

        // Map likedSongs to match queue item structure if needed, or queue can hold mixed types?
        // history items have: { id, url, title, dbId, fromPlaylist... }
        // likedSongs items have: { video_id, url, title, id (row id)... }

        // We need to homogenize.
        const likedQueue = likedSongs.map(s => ({
            id: s.video_id,
            url: s.url,
            title: s.title,
            dbId: undefined, // Liked songs don't track history DB id in this context
            fromPlaylist: false, // Treat as flat list
            isLikedItem: true // Tag it
        }));

        setQueue(likedQueue);

        // Find index of clicked song
        const idx = likedQueue.findIndex(q => q.id === song.video_id);
        setCurrentIndex(idx !== -1 ? idx : 0);

        setHasStarted(true);
        setPlayingSource('Liked Songs');
    };

    const handleUnlikeFromList = async (song: any) => {
        if (!user) return;
        // Optimistic update for list
        setLikedSongs(prev => prev.filter(s => s.id !== song.id));

        // If we are currently playing from Liked Songs Queue
        if (playingSource === 'Liked Songs') {
            // Remove from queue too
            setQueue(prev => {
                const newQueue = prev.filter(q => q.id !== song.video_id);
                // Adjust index if needed?
                // If we removed the current item...
                // Ideally we let it play or stop? 
                // Let's just remove it. React will re-render. 
                // If index becomes invalid (>= length), simple adjust:
                if (currentIndex >= newQueue.length) {
                    setCurrentIndex(Math.max(0, newQueue.length - 1));
                }
                return newQueue;
            });
        }

        // If this song is currently playing, update local like state
        if (currentIndex >= 0 && queue[currentIndex] && queue[currentIndex].id === song.video_id) {
            setIsLiked(false);
        }

        await supabase.from('liked_songs').delete()
            .eq('user_id', user.id)
            .eq('id', song.id); // Use row ID or video_id? List normally has row ID. state uses * rows.
    };

    const handleGoHome = () => {
        setCurrentIndex(-1); // Resets videoId to null -> Shows Menu
        setIsPlaying(false);
        setPlayingSource('History'); // Default back
        // Should we reset queue to history?
        // Ideally yes, navigating Home resets context.
        setQueue(history);
    };

    const handleToggleLike = async () => {
        if (!isSignedIn || !user || currentIndex < 0 || !queue[currentIndex]) return;
        const currentItem = queue[currentIndex];

        if (isLiked) {
            // Remove
            setIsLiked(false); // Optimistic
            await supabase.from('liked_songs').delete()
                .eq('user_id', user.id)
                .eq('video_id', currentItem.id);
        } else {
            // Add
            setIsLiked(true); // Optimistic
            const duration = playerRef.current?.getDuration() || 0;
            await supabase.from('liked_songs').upsert({
                user_id: user.id,
                video_id: currentItem.id,
                title: currentItem.title,
                url: currentItem.url,
                duration: Math.floor(duration)
            }, { onConflict: 'user_id, video_id' });
        }
    };

    return (
        <>
            {/* Sidebar */}
            {hasStarted && (
                <div className="fixed top-8 left-8 z-50 flex flex-col gap-4 w-64">
                    <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/20">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Player</span>
                            <div className="flex gap-2">
                                {isLoaded && (
                                    isSignedIn ? <UserButton /> : <SignInButton mode="modal"><button className="text-xs bg-black text-white px-3 py-1.5 rounded-full font-medium hover:bg-gray-800 transition-colors">Sign In</button></SignInButton>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                            <button onClick={playPrev} disabled={currentIndex <= 0} className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors" title="Previous Video">
                                <SkipBack size={20} fill="currentColor" />
                            </button>

                            <button onClick={() => handleSeek(-5)} className="p-2 rounded-full hover:bg-gray-100 transition-colors" title="Rewind 5s">
                                <Rewind size={20} fill="currentColor" />
                            </button>

                            <button onClick={togglePlayPause} className="p-3 bg-black text-white rounded-full hover:bg-gray-800 transition-transform active:scale-95 shadow-lg">
                                {isPlaying ? <CustomPauseIcon size={24} fill="white" /> : <CustomPlayIcon size={24} fill="white" />}
                            </button>

                            <button onClick={() => handleSeek(5)} className="p-2 rounded-full hover:bg-gray-100 transition-colors" title="Forward 5s">
                                <FastForward size={20} fill="currentColor" />
                            </button>

                            <button onClick={playNext} disabled={currentIndex >= queue.length - 1} className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors" title="Next Video">
                                <SkipForward size={20} fill="currentColor" />
                            </button>
                        </div>
                    </div>
                    {/* Show Up Next ONLY if queue is present and has invalid items? */
                        /* Actually, sidebar is for History/Queue. If in Liked Mode, we should probably show Liked Queue? */
                        /* Original code logic relies heavily on 'history' state for sidebar lists. */
                        /* For now, let's keep Sidebar showing HISTORY (the persistent record). */
                        /* BUT Up Next should show QUEUE coming up. */
                    }
                    {(history.length > 0 || !isSignedIn) && (
                        <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-white/20 overflow-hidden transition-all">
                            <button
                                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                                className="w-full flex justify-between items-center mb-2 px-2 group"
                            >
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-gray-700 transition-colors">History</h3>
                                {isHistoryOpen ? <ChevronUp size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" /> : <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600 transition-colors" />}
                            </button>

                            <AnimatePresence>
                                {isHistoryOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2, ease: "easeInOut" }}
                                        className="overflow-hidden"
                                    >
                                        <div className="max-h-[300px] overflow-y-auto">
                                            {!isSignedIn ? (
                                                <div className="flex flex-col gap-3 p-2">
                                                    <p className="text-xs text-gray-600 leading-relaxed font-medium">
                                                        To save your videos into history, please sign in.
                                                    </p>
                                                    <SignInButton mode="modal">
                                                        <button className="w-full text-xs bg-black text-white px-3 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-sm">
                                                            Sign In
                                                        </button>
                                                    </SignInButton>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1 pb-1" ref={historyContainerRef}>
                                                    {/* NOTE: Sidebar still shows HISTORY (all played), even if Queue is different. 
                                                        If user clicks here, it switches queue back to history in playHistoryItem. */
                                                        (() => {
                                                            const visibleHistory = history;
                                                            const renderedGroups: React.ReactNode[] = [];
                                                            let i = 0;
                                                            while (i < visibleHistory.length) {
                                                                const item = visibleHistory[i];

                                                                if (item.fromPlaylist && item.playlistId) {
                                                                    // Start of a playlist group?
                                                                    // Check consecutive items with same playlistId
                                                                    const groupStartIndex = i;
                                                                    let groupEndIndex = i;
                                                                    while (
                                                                        groupEndIndex + 1 < visibleHistory.length &&
                                                                        visibleHistory[groupEndIndex + 1].playlistId === item.playlistId
                                                                    ) {
                                                                        groupEndIndex++;
                                                                    }

                                                                    // Render visual group item
                                                                    const isActive = currentIndex >= groupStartIndex && currentIndex <= groupEndIndex;
                                                                    const groupTitle = item.playlistTitle || 'Playlist';

                                                                    renderedGroups.push(
                                                                        <motion.button
                                                                            layout
                                                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                                            key={`group-${item.playlistId}`} // Stable key
                                                                            data-active={isActive}
                                                                            onClick={() => playHistoryItem(groupStartIndex)}
                                                                            className={`flex items-center gap-2 text-left text-xs p-2 rounded-lg truncate transition-all w-full ${isActive ? 'bg-black/5 text-black font-semibold' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}
                                                                        >
                                                                            <CustomPlaylistIcon size={12} className="shrink-0 opacity-50" />
                                                                            <span className="truncate">{groupTitle}</span>
                                                                        </motion.button>
                                                                    );

                                                                    // Skip processed items
                                                                    i = groupEndIndex + 1;
                                                                } else {
                                                                    // Single item
                                                                    const itemIndex = i;
                                                                    const isActive = itemIndex === currentIndex;
                                                                    renderedGroups.push(
                                                                        <motion.button
                                                                            layout
                                                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                                            key={`item-${item.id}`} // Stable key
                                                                            data-active={isActive}
                                                                            onClick={() => playHistoryItem(itemIndex)}
                                                                            className={`flex items-center gap-2 text-left text-xs p-2 rounded-lg truncate transition-all w-full ${isActive ? 'bg-black/5 text-black font-semibold' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}
                                                                        >
                                                                            <Film size={12} className="shrink-0 opacity-50" />
                                                                            <span className="truncate">{item.title}</span>
                                                                        </motion.button>
                                                                    );
                                                                    i++;
                                                                }
                                                            }
                                                            return renderedGroups.reverse();
                                                        })()}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            )}

            {/* Upcoming Sidebar - Bottom Right */}
            {hasStarted && (
                <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-4 w-64 items-end pointer-events-none">
                    <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/20 pointer-events-auto max-h-[300px] overflow-hidden flex flex-col w-full">
                        <h3 className="text-xs font-bold text-gray-500 mb-3 px-1 uppercase tracking-wider text-left">Up Next</h3>
                        <div className="flex flex-col gap-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                            {/* Show from QUEUE now, not history, unless queue IS history */}
                            {queue.slice(currentIndex + 1).length === 0 && (
                                <div className="text-left text-xs text-gray-400 italic py-2">No upcoming videos</div>
                            )}
                            {queue
                                .slice(currentIndex + 1)
                                .map((item, idx) => ({ item, originalIndex: currentIndex + 1 + idx }))
                                // .filter filter removed, show all in queue
                                .map(({ item, originalIndex }, idx) => (
                                    <button
                                        key={`upcoming-${item.id}-${idx}`}
                                        // Handle playing from Up Next? 
                                        // If it's queue, just jump index.
                                        onClick={() => setCurrentIndex(originalIndex)}
                                        className="w-full text-left text-sm font-medium p-2 rounded-lg transition-all text-gray-600 hover:bg-black/5 hover:text-black break-words"
                                    >
                                        {item.title}
                                    </button>
                                ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Input Bar - Top Right */}
            {
                hasStarted && (
                    <div className="fixed top-8 right-8 z-50 flex items-center bg-white/80 backdrop-blur-md p-1.5 rounded-full shadow-lg border border-white/20 transition-all hover:bg-white/95">
                        <div className="pl-3 pr-2 text-gray-500"><Link2 size={16} /></div>
                        <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} onKeyDown={handleKeyDown} placeholder="Paste YouTube URL..." className="w-64 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400 font-medium" />
                        <button onClick={handleConfirm} className="flex items-center justify-center w-8 h-8 bg-black text-white rounded-full hover:bg-gray-800 transition-colors ml-1 shadow-sm"><CustomPlayIcon size={12} fill="white" /></button>
                    </div>
                )
            }

            {/* Initial Center Input Screen */}
            {
                !hasStarted && (
                    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center font-sans backdrop-blur-[8px] bg-black/40 transition-all duration-1000">
                        <div className="flex flex-col items-center gap-8 animate-in compile-in zoom-in-95 duration-700 fade-in slide-in-from-bottom-8">
                            <div className="space-y-2 text-center">
                                <h2 className="text-white text-3xl font-light tracking-tight">Paste a YouTube URL</h2>
                                <p className="text-white/60 text-sm font-light">to start watching immediately</p>
                            </div>

                            <div className="bg-white/10 backdrop-blur-md pl-4 pr-1.5 py-1.5 rounded-2xl border border-white/10 flex items-center w-[420px] shadow-2xl transition-all focus-within:bg-white/15 focus-within:border-white/30 hover:bg-white/15 group">
                                <div className="mr-3 text-white/40 group-focus-within:text-white/80 transition-colors">
                                    <Link2 size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="youtube.com/watch?v=..."
                                    className="flex-1 bg-transparent border-none outline-none text-base text-white placeholder-white/30 font-light focus:ring-0"
                                    autoFocus
                                />
                                <button
                                    onClick={handleConfirm}
                                    className="flex items-center justify-center w-9 h-9 bg-white text-black rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg ml-2"
                                >
                                    <CustomPlayIcon size={14} fill="black" />
                                </button>
                            </div>

                            <div className="flex flex-col items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={dontAskAgain}
                                        onChange={(e) => setDontAskAgain(e.target.checked)}
                                        className="w-4 h-4 rounded border-white/30 bg-white/10 text-black focus:ring-0 focus:ring-offset-0 transition-colors cursor-pointer"
                                    />
                                    <span className="text-white/40 group-hover:text-white/80 text-xs font-light tracking-wide transition-colors user-select-none">Don't ask again</span>
                                </label>

                                <button
                                    onClick={handleSkip}
                                    className="text-white/30 hover:text-white text-xs font-medium tracking-wide transition-colors px-4 py-2 rounded-full hover:bg-white/5"
                                >
                                    Skip for now
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }


            <div className="w-[370px] h-[600px]">
                <Canvas camera={{ position: [0, 0, 15], fov: 20 }}>
                    <ambientLight intensity={0.5} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
                    <pointLight position={[-10, -10, -10]} intensity={1} />

                    <Suspense fallback={<LoadingState />}>
                        <group>
                            <Model />
                            <DelayWaiter resource={delayResource} />
                            <ScreenOverlay
                                videoId={currentVideoId}
                                title={currentIndex >= 0 && queue[currentIndex] ? queue[currentIndex].title : undefined}
                                index={currentIndex + 1}
                                total={queue.length}
                                onPlayerReady={handlePlayerReady}
                                onStateChange={handleStateChange}
                                playingSource={playingSource}
                                isLiked={isLiked}
                                onToggleLike={handleToggleLike}
                                user={user}
                                likedSongs={likedSongs}
                                onPlay={handlePlayFromLiked}
                                onUnlike={handleUnlikeFromList}
                                onGoHome={handleGoHome}
                                channelName={currentIndex >= 0 && queue[currentIndex] ? queue[currentIndex].channel : undefined}
                                lastPlayed={history.length > 0 ? history[history.length - 1] : undefined}
                                onResume={() => playHistoryItem(history.length - 1)}
                            />
                        </group>
                    </Suspense>

                    <Environment preset="studio" />
                    <OrbitControls enableZoom={true} minDistance={0.69} maxDistance={0.69} />
                    <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
                </Canvas>
            </div>
        </>
    );
}
