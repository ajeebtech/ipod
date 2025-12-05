'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import YouTube, { YouTubePlayer } from 'react-youtube';
import { Play, Link2, SkipBack, SkipForward, Trash2 } from 'lucide-react';
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import { supabase } from '../lib/supabase';

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
    onPlayerReady: (player: YouTubePlayer) => void;
    onStateChange: (event: any) => void;
}

function ScreenOverlay({ videoId, onPlayerReady, onStateChange }: ScreenOverlayProps) {
    if (!videoId) return null;
    return (
        <Html
            transform
            occlude="blending"
            position={[0.01, 0.05, 0.00]}
            rotation={[-0.1, 1.55, 0.1]}
            scale={0.01}
            style={{
                width: '320px',
                height: '240px',
                pointerEvents: 'none',
            }}
        >
            <div className="w-full h-full flex flex-col items-center justify-start bg-black overflow-hidden p-0 pointer-events-none">
                <div className="w-full h-full relative">
                    <YouTube
                        videoId={videoId}
                        onReady={(e) => onPlayerReady(e.target)}
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
                            },
                        }}
                        className="w-full h-full"
                    />
                </div>
            </div>
        </Html>
    );
}

export function Ipod3D() {
    const { user, isLoaded, isSignedIn } = useUser();
    const [videoUrl, setVideoUrl] = useState('');
    const [history, setHistory] = useState<{ id: string; url: string; title: string; dbId?: number }[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState(false);

    // Player ref
    const playerRef = useRef<YouTubePlayer | null>(null);

    const currentVideoId = currentIndex >= 0 && history[currentIndex] ? history[currentIndex].id : null;

    useEffect(() => {
        if (isSignedIn && user) {
            const fetchHistory = async () => {
                const { data, error } = await supabase
                    .from('history')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: true });

                if (data) {
                    const mappedHistory = data.map((item: any) => ({
                        id: item.video_id,
                        url: item.url,
                        title: item.title,
                        dbId: item.id
                    }));
                    setHistory(mappedHistory);
                    if (mappedHistory.length > 0) setCurrentIndex(mappedHistory.length - 1);
                }
            };
            fetchHistory();
        }
    }, [isSignedIn, user]);

    const handlePlayerReady = (player: YouTubePlayer) => {
        playerRef.current = player;
        if (player.getPlayerState() !== 1) {
            player.playVideo();
        }
    };

    const handleStateChange = async (event: any) => {
        if (event.data === 1) setIsPlaying(true);
        if (event.data === 2) setIsPlaying(false);

        const player = event.target;
        if (player && player.getVideoData && isSignedIn && user && currentIndex >= 0) {
            const data = player.getVideoData();
            const currentItem = history[currentIndex];

            if (data && data.title && currentItem && (currentItem.title === 'Loading title...' || currentItem.title !== data.title)) {
                setHistory(prev => {
                    const newHistory = [...prev];
                    newHistory[currentIndex] = { ...newHistory[currentIndex], title: data.title };
                    return newHistory;
                });
                if (currentItem.dbId) {
                    await supabase
                        .from('history')
                        .update({ title: data.title })
                        .eq('id', currentItem.dbId);
                }
            }
        }
    };

    const handleConfirm = async () => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = videoUrl.match(regExp);
        if (match && match[2].length === 11) {
            const newId = match[2];
            const title = 'Loading title...';

            let dbId;
            if (isSignedIn && user) {
                const { data, error } = await supabase
                    .from('history')
                    .insert([
                        { user_id: user.id, video_id: newId, url: videoUrl, title: title }
                    ])
                    .select();
                if (data && data[0]) dbId = data[0].id;
            }

            const newItem = { id: newId, url: videoUrl, title: title, dbId: dbId };
            setHistory(prev => [...prev, newItem]);
            setCurrentIndex(prev => history.length);
            setVideoUrl('');
        }
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

    const playNext = () => {
        if (currentIndex < history.length - 1) setCurrentIndex(prev => prev + 1);
    };

    const playPrev = () => {
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    };

    const playHistoryItem = (index: number) => {
        setCurrentIndex(index);
    };

    return (
        <>
            {/* Sidebar */}
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
                        <button onClick={playPrev} disabled={currentIndex <= 0} className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors">
                            <SkipBack size={20} fill="currentColor" />
                        </button>
                        <button onClick={togglePlayPause} className="p-3 bg-black text-white rounded-full hover:bg-gray-800 transition-transform active:scale-95 shadow-lg">
                            {isPlaying ? <CustomPauseIcon size={24} fill="white" /> : <CustomPlayIcon size={24} fill="white" />}
                        </button>
                        <button onClick={playNext} disabled={currentIndex >= history.length - 1} className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 transition-colors">
                            <SkipForward size={20} fill="currentColor" />
                        </button>
                    </div>
                </div>
                {history.length > 0 && (
                    <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-white/20 max-h-[300px] overflow-y-auto">
                        <h3 className="text-xs font-bold text-gray-500 mb-2 px-2 uppercase tracking-wider">History</h3>
                        <div className="flex flex-col gap-1">
                            {history.map((item, idx) => (
                                <button key={`${item.id}-${idx}`} onClick={() => playHistoryItem(idx)} className={`text-left text-xs p-2 rounded-lg truncate transition-all ${idx === currentIndex ? 'bg-black/5 text-black font-semibold' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}>
                                    {item.title}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Input Bar */}
            <div className="fixed top-8 right-8 z-50 flex items-center bg-white/80 backdrop-blur-md p-1.5 rounded-full shadow-lg border border-white/20 transition-all hover:bg-white/95">
                <div className="pl-3 pr-2 text-gray-500"><Link2 size={16} /></div>
                <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} onKeyDown={handleKeyDown} placeholder="Paste YouTube URL..." className="w-64 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400 font-medium" />
                <button onClick={handleConfirm} className="flex items-center justify-center w-8 h-8 bg-black text-white rounded-full hover:bg-gray-800 transition-colors ml-1 shadow-sm"><CustomPlayIcon size={12} fill="white" /></button>
            </div>

            <div className="w-[370px] h-[600px]">
                <Canvas camera={{ position: [0, 0, 15], fov: 20 }}>
                    <ambientLight intensity={0.5} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
                    <pointLight position={[-10, -10, -10]} intensity={1} />

                    <group>
                        <Model />
                        <ScreenOverlay
                            videoId={currentVideoId}
                            onPlayerReady={handlePlayerReady}
                            onStateChange={handleStateChange}
                        />
                    </group>

                    <Environment preset="studio" />
                    <OrbitControls enableZoom={true} minDistance={0.69} maxDistance={0.69} />
                    <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
                </Canvas>
            </div>
        </>
    );
}
