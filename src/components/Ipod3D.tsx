'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import YouTube, { YouTubePlayer } from 'react-youtube';
import { Play, Link2, SkipBack, SkipForward, Trash2, Film, Rewind, FastForward, Battery, Heart, Home, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, UserButton, SignIn, SignInButton } from "@clerk/nextjs";
import { supabase } from '../lib/supabase';
import { fetchPlaylistItems } from '../lib/youtube-api';
import MiniPlayer from './MiniPlayer';

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
    showHome?: boolean;
    // New Props for lifted state
    progress: number;
    currentTime: number;
    duration: number;
    isPaused: boolean;
    onLoad: () => void;
}

function ScreenOverlay({ videoId, title, index, total, onPlayerReady, onStateChange, playingSource, isLiked, onToggleLike, user, likedSongs, onPlay, onUnlike, onGoHome, channelName, lastPlayed, onResume, showHome, progress, currentTime, duration, isPaused, onLoad }: ScreenOverlayProps) {
    // Removed internal tracking state
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



    // REMOVED: Internal useEffect interval for progress (lifted to Ipod3D)


    // --- Spacebar Key Handler & Load Signal ---
    useEffect(() => {
        onLoad();
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

    const showMenu = !videoId || showHome;

    return (
        <>
            {/* REMOVED: 3D MINI PLAYER (Floating) - Now rendered in Ipod3D as 2D */}

            <Html
                transform
                occlude="raycast"
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
                    {/* Persistent Player - Hidden but mounted */}
                    {videoId && (
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
                    )}

                    {showMenu ? (
                        // --- MENU VIEW (Home / Liked Songs) ---
                        <div className="w-full h-full flex font-sans relative z-10">
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
                                    <div
                                        className="flex-1 overflow-y-auto ipod-scrollbar"
                                        onPointerDown={(e) => e.stopPropagation()}
                                    >
                                        <style>{`
                                            .ipod-scrollbar::-webkit-scrollbar {
                                                width: 5px;
                                            }
                                            .ipod-scrollbar::-webkit-scrollbar-track {
                                                background: transparent;
                                            }
                                            .ipod-scrollbar::-webkit-scrollbar-thumb {
                                                background-color: #3b82f6;
                                                border-radius: 4px;
                                            }
                                            .ipod-scrollbar::-webkit-scrollbar-thumb:hover {
                                                background-color: #2563eb;
                                            }
                                        `}</style>
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
                    ) : (
                        // --- NOW PLAYING VIEW ---
                        <div className="w-full h-full flex flex-col relative z-10">
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
                    )}
                </div>
            </Html>
        </>
    );
}



import { usePlayer } from '../context/PlayerContext';

export default function Ipod3D() {
    const { setHistory: setCtxHistory, setQueue: setCtxQueue, setCurrentIndex: setCtxCurrentIndex, registerPlayHandler } = usePlayer();
    const { user, isLoaded, isSignedIn } = useUser();
    const [isFocused, setIsFocused] = useState(false);
    const [videoUrl, setVideoUrl] = useState('');
    const [history, setHistory] = useState<{ id: string; url: string; title: string; dbId?: number; fromPlaylist?: boolean; playlistId?: string; playlistTitle?: string; channel?: string }[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasStarted, setHasStarted] = useState(true);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isModelLoaded, setIsModelLoaded] = useState(false);

    const [showHome, setShowHome] = useState(false);

    // --- Player Tracking State (Lifted for MiniPlayer) ---
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    // --- History & Persistence ---
    const [dontAskAgain, setDontAskAgain] = useState(false);
    const [playingSource, setPlayingSource] = useState<'From URL' | 'History' | 'Liked Songs'>('History');
    const [isLiked, setIsLiked] = useState(false);
    const [queue, setQueue] = useState<any[]>([]);
    const [likedSongs, setLikedSongs] = useState<any[]>([]);

    // OS Detection for Zoom Hint
    const [zoomKey, setZoomKey] = useState('Cmd');
    const [showZoomAlert, setShowZoomAlert] = useState(false); // Initially false, wait for load

    useEffect(() => {
        if (typeof navigator !== 'undefined') {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            setZoomKey(isMac ? 'Cmd' : 'Ctrl');
        }
    }, []);

    // Zoom Alert Timer - Starts only after Model Load
    useEffect(() => {
        if (isModelLoaded) {
            setShowZoomAlert(true);
            const timer = setTimeout(() => {
                setShowZoomAlert(false);
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [isModelLoaded]);

    // Sync to Context
    useEffect(() => {
        setCtxHistory(history);
    }, [history, setCtxHistory]);

    useEffect(() => {
        setCtxQueue(queue);
    }, [queue, setCtxQueue]);

    useEffect(() => {
        setCtxCurrentIndex(currentIndex);
    }, [currentIndex, setCtxCurrentIndex]);

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

                        if (playlistId && !playlistTitle) {
                            playlistTitle = 'Playlist';
                        }

                        return {
                            id: item.video_id,
                            url: item.url,
                            title: item.title,
                            channel: item.channel,
                            dbId: item.id,
                            fromPlaylist: !!playlistId,
                            playlistId: playlistId,
                            playlistTitle: playlistTitle
                        };
                    });

                    if (mappedHistory.length > 0) {
                        // Reverse to show latest first for History UI (if DB returns ascending)
                        // Wait, my previous replacement trialed 'order created_at desc'.
                        // The current code at line 692 says 'ascending: true'.
                        // If I want latest first in array for UI which reverses it, then ascending is correct (oldest first).
                        // But HistoryDrawer reverses it.
                        // Let's stick to: DB returns oldest -> newest. HistoryDrawer reverses -> newest -> oldest.

                        setHistory(mappedHistory);
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
        if (event.data === 1) {
            setIsPlaying(true);
            // When playing, try to fetch channel name if missing
            if (playerRef.current) {
                const data = playerRef.current.getVideoData();
                if (data && data.author && currentIndex >= 0 && queue[currentIndex]) {
                    const currentItem = queue[currentIndex];
                    // If channel is missing or different, update it
                    if (!currentItem.channel) {
                        const author = data.author;

                        // Update local state
                        setQueue(prev => {
                            const newQueue = [...prev];
                            // Must check index again in case it changed
                            if (newQueue[currentIndex]) {
                                newQueue[currentIndex] = { ...newQueue[currentIndex], channel: author };
                            }
                            return newQueue;
                        });
                        setHistory(prev => {
                            const newHistory = [...prev];
                            const idx = newHistory.findIndex(h => h.id === currentItem.id);
                            if (idx !== -1) {
                                newHistory[idx] = { ...newHistory[idx], channel: author };
                            }
                            return newHistory;
                        });

                        // Update DB if user is signed in
                        if (isSignedIn && user) {
                            await supabase
                                .from('history')
                                .update({ channel: author })
                                .eq('user_id', user.id)
                                .eq('video_id', currentItem.id);
                        }
                    }
                }
            }
        }
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

    // --- Unified Progress Tracking Loop ---
    useEffect(() => {
        const interval = setInterval(() => {
            if (playerRef.current && playerRef.current.getCurrentTime && playerRef.current.getDuration) {
                const current = playerRef.current.getCurrentTime();
                const dur = playerRef.current.getDuration();
                if (dur > 0) {
                    setProgress((current / dur) * 100);
                    setDuration(dur);
                    setCurrentTime(current);
                    if (playerRef.current.getPlayerState) {
                        const state = playerRef.current.getPlayerState();
                        setIsPaused(state !== 1 && state !== 3); // 1 = playing, 3 = buffering
                    }
                }
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Toggle Play function exposed to MiniPlayer
    const togglePlay = () => {
        if (playerRef.current) {
            if (isPaused) {
                playerRef.current.playVideo();
                setIsPaused(false);
            } else {
                playerRef.current.pauseVideo();
                setIsPaused(true);
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
                        channel: item.channel,
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
                            channel: item.channel,
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
            setShowHome(false);
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
        // Ensure this logic handles everything correctly
        // We'll wrap this or similar logic in the handler

        // RE-IMPLEMENTATION TO ENSURE FULL CONTEXT PLAYBACK
        if (playingSource !== 'History') {
            setPlayingSource('History');
            // If we switch to history, we must ensure queue covers history
            if (queue !== history) {
                setQueue(history);
            }
        }
        setCurrentIndex(index);
        // Auto-play is handled by currentIndex effect usually
        setShowHome(false);
    };

    // Register Context Handler
    useEffect(() => {
        registerPlayHandler((type, index) => {
            if (type === 'history') {
                playHistoryItem(index);
            } else if (type === 'queue') {
                // If it's pure queue (Up Next)
                // Ensure we are in the right mode if needed, or just set index if queue is already active
                // For now, assuming Up Next is just future items of current queue
                setCurrentIndex(index);
            }
        });
    }, [registerPlayHandler, history, queue, playingSource]); // Add dependencies as needed


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
        setShowHome(false);

        // Sync to History (Background)
        if (user && song.video_id) {
            // 1. Update Supabase
            try {
                // Delete existing entry for this video to bring it to top
                await supabase.from('history').delete().eq('user_id', user.id).eq('video_id', song.video_id);
                // Insert new entry
                const { data, error } = await supabase.from('history').insert({
                    user_id: user.id,
                    video_id: song.video_id,
                    title: song.title,
                    url: song.url
                }).select().single();

                if (!error && data) {
                    // 2. Update Local History State
                    setHistory(prev => {
                        const filtered = prev.filter(h => h.id !== song.video_id);
                        return [...filtered, {
                            id: song.video_id,
                            url: song.url,
                            title: song.title,
                            dbId: data.id,
                            channel: undefined // We'll fetch this on play
                        }];
                    });
                }
            } catch (err) {
                console.error("Failed to sync liked song to history", err);
            }
        }
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
        if (currentVideoId) {
            setShowHome(true);
        } else {
            setCurrentIndex(-1); // Resets videoId to null -> Shows Menu
            setIsPlaying(false);
            setPlayingSource('History'); // Default back
            setQueue(history);
        }
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
                channel: currentItem.channel || currentItem.author || "",
                duration: Math.floor(duration)
            }, { onConflict: 'user_id, video_id' });
        }
    };

    return (
        <>
            {/* MINI PLAYER (2D Overlay) */}
            <AnimatePresence>
                {hasStarted && showHome && currentVideoId && (
                    <MiniPlayer
                        key="mini-player"
                        videoId={currentVideoId}
                        title={currentIndex >= 0 && queue[currentIndex] ? queue[currentIndex].title : ''}
                        artist={currentIndex >= 0 && queue[currentIndex] ? (queue[currentIndex].channel || "YouTube") : ''}
                        progress={progress}
                        currentTime={currentTime}
                        duration={duration}
                        isPaused={isPaused}
                        onTogglePlay={togglePlay}
                        onResume={() => setShowHome(false)} // Go back to player view
                    />
                )}
            </AnimatePresence>

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

                </div>
            )}

            {/* Upcoming Sidebar - Bottom Right */}


            {/* Input Bar - Top Center (Persistent) */}
            {
                hasStarted && (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleConfirm();
                        }}
                        className="fixed top-8 right-8 w-[360px] px-4 z-50 animate-in slide-in-from-top-4 fade-in duration-700"
                    >
                        <div
                            className={`
                            relative backdrop-blur-xl bg-white/70 rounded-2xl 
                            border border-white/50 shadow-lg
                            transition-all duration-300 ease-out
                            ${isFocused ? "shadow-xl shadow-stone-300/50 bg-white/90 scale-[1.02]" : ""}
                        `}
                        >
                            {/* Subtle inner glow */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/80 to-transparent pointer-events-none" />

                            <div className="relative flex items-center">
                                {/* Minimal link icon */}
                                <div className="pl-5 pr-2">
                                    <svg
                                        className={`w-4 h-4 transition-colors duration-200 ${isFocused ? "text-stone-600" : "text-stone-400"}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
                                        />
                                    </svg>
                                </div>

                                <input
                                    type="url"
                                    placeholder="Paste a YouTube link"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    className="
                                flex-1 bg-transparent py-4 pr-4 
                                text-stone-800 text-[15px] font-light tracking-wide
                                placeholder:text-stone-400 placeholder:font-light
                                focus:outline-none
                            "
                                />

                                {/* Animated submit button */}
                                <div className="pr-2">
                                    <button
                                        type="submit"
                                        className={`
                                relative w-10 h-10 rounded-xl 
                                bg-gradient-to-b from-stone-700 to-stone-900
                                shadow-md hover:shadow-lg
                                transition-all duration-200 ease-out
                                hover:scale-105 active:scale-95
                                flex items-center justify-center
                                ${videoUrl.trim() ? "opacity-100" : "opacity-40"}
                                `}
                                        disabled={!videoUrl.trim()}
                                    >
                                        {/* Button shine */}
                                        <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/20 to-transparent" />
                                        <Play className="w-4 h-4 text-white fill-white relative z-10 ml-0.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                )
            }
            {/* Initial Center Input Screen */}
            {
                !hasStarted && (
                    <div className="fixed inset-0 z-[9999] bg-stone-100 flex flex-col items-center justify-center p-4 relative font-sans transition-all duration-1000">
                        {/* URL Input - Top Center */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleConfirm();
                            }}
                            className="absolute top-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 animate-in slide-in-from-top-4 fade-in duration-700"
                        >
                            <div
                                className={`
                                relative backdrop-blur-xl bg-white/70 rounded-2xl 
                                border border-white/50 shadow-lg
                                transition-all duration-300 ease-out
                                ${isFocused ? "shadow-xl shadow-stone-300/50 bg-white/90 scale-[1.02]" : ""}
                            `}
                            >
                                {/* Subtle inner glow */}
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/80 to-transparent pointer-events-none" />

                                <div className="relative flex items-center">
                                    {/* Minimal link icon */}
                                    <div className="pl-5 pr-2">
                                        <svg
                                            className={`w-4 h-4 transition-colors duration-200 ${isFocused ? "text-stone-600" : "text-stone-400"}`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2}
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
                                            />
                                        </svg>
                                    </div>

                                    <input
                                        type="url"
                                        placeholder="Paste a YouTube link"
                                        value={videoUrl}
                                        onChange={(e) => setVideoUrl(e.target.value)}
                                        onFocus={() => setIsFocused(true)}
                                        onBlur={() => setIsFocused(false)}
                                        className="
                                    flex-1 bg-transparent py-4 pr-4 
                                    text-stone-800 text-[15px] font-light tracking-wide
                                    placeholder:text-stone-400 placeholder:font-light
                                    focus:outline-none
                                "
                                        autoFocus
                                    />

                                    {/* Animated submit button */}
                                    <div className="pr-2">
                                        <button
                                            type="submit"
                                            className={`
                                    relative w-10 h-10 rounded-xl 
                                    bg-gradient-to-b from-stone-700 to-stone-900
                                    shadow-md hover:shadow-lg
                                    transition-all duration-200 ease-out
                                    hover:scale-105 active:scale-95
                                    flex items-center justify-center
                                    ${videoUrl.trim() ? "opacity-100" : "opacity-40"}
                                    `}
                                            disabled={!videoUrl.trim()}
                                        >
                                            {/* Button shine */}
                                            <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/20 to-transparent" />
                                            <Play className="w-4 h-4 text-white fill-white relative z-10 ml-0.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Subtle hint text */}
                            <p
                                className={`
                            text-center text-[11px] text-stone-400 mt-2 font-light tracking-wide
                            transition-opacity duration-200
                            ${isFocused ? "opacity-100" : "opacity-0"}
                            `}
                            >
                                Press Enter or click play to start
                            </p>

                            {/* Helper Controls (Skip / Don't Ask) - Kept from original but styled subtly */}
                            <div className="flex justify-center items-center gap-6 mt-8 opacity-60 hover:opacity-100 transition-opacity">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={dontAskAgain}
                                        onChange={(e) => setDontAskAgain(e.target.checked)}
                                        className="w-3.5 h-3.5 rounded border-stone-300 bg-white/50 text-stone-600 focus:ring-0 cursor-pointer"
                                    />
                                    <span className="text-stone-400 group-hover:text-stone-600 text-[11px] font-light transition-colors user-select-none">Don't ask again</span>
                                </label>

                                <button
                                    onClick={handleSkip}
                                    className="text-stone-400 hover:text-stone-600 text-[11px] uppercase tracking-widest transition-colors font-medium border-b border-transparent hover:border-stone-300"
                                >
                                    Skip
                                </button>
                            </div>
                        </form>
                    </div>
                )
            }


            <div className="w-[370px] h-[600px]">
                <Canvas camera={{ position: [0, 1.4, 15], fov: 20 }}>
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
                                channelName={currentIndex >= 0 && queue[currentIndex] ? queue[currentIndex].channel : undefined}
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
                                lastPlayed={history.length > 0 ? history[history.length - 1] : undefined}
                                onResume={() => {
                                    if (currentVideoId && showHome) {
                                        setShowHome(false);
                                    } else {
                                        playHistoryItem(history.length - 1);
                                    }
                                }}
                                showHome={showHome}
                                // Passed down state
                                progress={progress}
                                currentTime={currentTime}
                                duration={duration}
                                isPaused={isPaused}
                                onLoad={() => setIsModelLoaded(true)}
                            />
                        </group>
                    </Suspense>

                    <Environment preset="studio" />
                    <OrbitControls enableZoom={true} minDistance={0.69} maxDistance={0.69} />
                    <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
                </Canvas>
            </div>
            {/* Zoom Instruction Hint */}
            <div className="fixed bottom-20 left-8 text-[10px] font-medium text-stone-500 opacity-60 pointer-events-none select-none z-0">
                if you can't see the screen, try {zoomKey} + or {zoomKey} -
            </div>

            {/* Zoom Alert Popup */}
            <AnimatePresence>
                {showZoomAlert && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.5 }}
                        className="fixed bottom-28 left-8 z-50 pointer-events-auto flex flex-col items-start"
                    >
                        <div className="relative bg-white/70 backdrop-blur-2xl pl-3.5 pr-1.5 py-1.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/80 mb-1.5 flex items-center gap-3 transform transition-all hover:scale-105">
                            <div className="text-[11px] font-semibold text-gray-800 tracking-tight">
                                Can't see the screen?
                            </div>
                            <button
                                onClick={() => setShowZoomAlert(false)}
                                className="w-5 h-5 flex items-center justify-center bg-black/5 hover:bg-black/10 rounded-full transition-colors text-gray-500"
                            >
                                <X size={10} strokeWidth={3} />
                            </button>
                        </div>
                        {/* Arrow pointing down */}
                        <div className="pl-6 text-stone-300 drop-shadow-sm">
                            <svg width="12" height="40" viewBox="0 0 12 40" fill="none">
                                <path d="M6 0.5V39.5M6 39.5L1 34.5M6 39.5L11 34.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
