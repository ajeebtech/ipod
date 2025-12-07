'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import YouTube, { YouTubePlayer } from 'react-youtube';
import { Play, Link2, SkipBack, SkipForward, Trash2, Film } from 'lucide-react';
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
            zIndexRange={[100, 0]}
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
    const [history, setHistory] = useState<{ id: string; url: string; title: string; dbId?: number; fromPlaylist?: boolean; playlistId?: string; playlistTitle?: string }[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [dontAskAgain, setDontAskAgain] = useState(false);

    // Player ref
    const playerRef = useRef<YouTubePlayer | null>(null);

    const currentVideoId = currentIndex >= 0 && history[currentIndex] ? history[currentIndex].id : null;

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
                        setHasStarted(true);
                        setCurrentIndex(mappedHistory.length);
                    }
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
        if (event.data === 0) {
            setIsPlaying(false);
            // Only auto-play if the next item is from a playlist
            const nextItem = history[currentIndex + 1];
            if (nextItem && nextItem.fromPlaylist) {
                playNext();
            }
        }

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
                setCurrentIndex(nextHistory.length - 1);
                return nextHistory;
            });

            setVideoUrl('');
            setHasStarted(true);
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

    const playNext = () => {
        if (currentIndex < history.length - 1) setCurrentIndex(prev => prev + 1);
    };

    const playPrev = () => {
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    };

    const playHistoryItem = async (index: number) => {
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
                    {(history.length > 0 || !isSignedIn) && (
                        <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-white/20 max-h-[300px] overflow-y-auto">
                            <h3 className="text-xs font-bold text-gray-500 mb-2 px-2 uppercase tracking-wider">History</h3>
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
                                <div className="flex flex-col gap-1" ref={historyContainerRef}>
                                    {(() => {
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
                    )}
                </div>
            )}

            {/* Upcoming Sidebar - Bottom Right */}
            {hasStarted && (
                <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-4 w-64 items-end pointer-events-none">
                    <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/20 pointer-events-auto max-h-[300px] overflow-hidden flex flex-col w-full">
                        <h3 className="text-xs font-bold text-gray-500 mb-3 px-1 uppercase tracking-wider text-left">Up Next</h3>
                        <div className="flex flex-col gap-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                            {history.slice(currentIndex + 1).filter(i => i.fromPlaylist).length === 0 && (
                                <div className="text-left text-xs text-gray-400 italic py-2">No upcoming videos</div>
                            )}
                            {history
                                .slice(currentIndex + 1)
                                .map((item, idx) => ({ item, originalIndex: currentIndex + 1 + idx }))
                                .filter(({ item }) => item.fromPlaylist)
                                .map(({ item, originalIndex }, idx) => (
                                    <button
                                        key={`upcoming-${item.id}-${idx}`}
                                        onClick={() => playHistoryItem(originalIndex)}
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
