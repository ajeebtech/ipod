
import React, { useRef, useState, useEffect } from 'react';
import YouTube from 'react-youtube';
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward, Repeat, Shuffle, ChevronDown, Plus, Heart, Pin, Search, Battery, Home, X, ListMusic, Volume2, VolumeX } from 'lucide-react';
import { IpodState } from '../hooks/useIpodState';

// --- Icons (internal copies for simplicity) ---
function CustomPlayIcon({ size = 24, fill = "currentColor" }: { size?: number, fill?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 5V19L19 12L8 5Z" fill={fill} />
        </svg>
    );
}

function CustomPauseIcon({ size = 24, fill = "currentColor" }: { size?: number, fill?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 19H10V5H6V19ZM14 5V19H18V5H14Z" fill={fill} />
        </svg>
    );
}

function CustomPlaylistIcon({ size = 24, className = "" }: { size?: number, className?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <line x1="19" y1="5" x2="5" y2="5"></line>
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <line x1="19" y1="19" x2="5" y2="19"></line>
            <path d="M19 19V12L12 12V19H19Z" fill="currentColor" stroke="none" opacity="0.2"></path>
        </svg>
    )
}


interface IpodScreenUIProps extends Omit<IpodState, 'isSignedIn'> {
    isSignedIn: boolean | undefined;
    onAddToPlaylist: () => void;
    seekToTime: (time: number) => void;
}

export default function IpodScreenUI(props: IpodScreenUIProps) {
    const {
        hasStarted, showHome, setShowHome,
        videoUrl, setVideoUrl, isSearching, searchResults, setSearchResults, searchError,
        queue, history, likedSongs, playlists, activePlaylistItems,
        currentVideoId, currentIndex, isPlaying, isPaused, isMuted, volume,
        progress, currentTime, duration, isLooping, playingSource, isLiked,
        user, isSignedIn, dontAskAgain, setDontAskAgain,
        handleConfirm, handleSkip, togglePlayPause, handleSeek, seekToTime,
        playNext, playPrev, handleVolumeChange, toggleMute,
        playHistoryItem, handlePlayFromLiked, handleUnlikeFromList, handleToggleLikeItem,
        handleGoHome, handleToggleLike, handleOpenPlaylist,
        playVideoFromUrl, handlePlayerReady, handleStateChange,
        onToggleLoop, onAddToPlaylist, formatTime
    } = props;

    // Local View State (UI only)
    const [view, setView] = useState<'home' | 'liked_songs' | 'playlist'>('home');
    const [viewTitle, setViewTitle] = useState('');
    const progressBarRef = useRef<HTMLDivElement>(null);

    // Update internal view when showHome changes
    // If showHome is true, we force view to 'home' maybe? 
    // Logic in Ipod3D was: `const showMenu = !videoId || showHome;`
    // And if `showMenu` is true, it renders the menu block.
    // The menu block uses `view` state. 

    const showMenu = !currentVideoId || showHome;

    const onSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressBarRef.current || !duration) return;
        const rect = progressBarRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        const percent = Math.max(0, Math.min(1, x / width));
        const newTime = percent * duration;
        // Call the hook's seek function (we need one that accepts specific time, not delta)
        // I added `seekToTime` to hook!
        seekToTime(newTime);
    };

    // Artist/Title Helpers
    const currentItem = currentIndex >= 0 && queue[currentIndex] ? queue[currentIndex] : null;
    let displayTitle = currentItem?.title || "No Title";
    let displayArtist = currentItem?.channel || "YouTube";

    // Fallback parsing if needed (copied from Ipod3D)
    // Actually the hook does extensive updating of title/channel, so we can rely on standard values mostly.

    return (
        <div className="w-full h-full bg-white border-2 border-black rounded-[4px] relative flex font-sans overflow-hidden box-border shadow-inner pointer-events-auto select-none">
            <style>{`
                .ipod-scrollbar::-webkit-scrollbar { width: 5px; }
                .ipod-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .ipod-scrollbar::-webkit-scrollbar-thumb { background-color: #3b82f6; border-radius: 4px; }
                .ipod-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #2563eb; }
            `}</style>

            {/* Hidden Player */}
            {currentVideoId && (
                <div className="absolute top-0 left-0 w-1 h-1 opacity-0 pointer-events-none overflow-hidden z-0">
                    <YouTube
                        videoId={currentVideoId}
                        onReady={handlePlayerReady}
                        onStateChange={handleStateChange}
                        opts={{
                            width: '100%', height: '100%',
                            playerVars: { autoplay: 1, controls: 0, fs: 0, modestbranding: 1, rel: 0, disablekb: 1, showinfo: 0, iv_load_policy: 3 }
                        }}
                    />
                </div>
            )}

            {showMenu ? (
                // --- MENU VIEW ---
                <div className="w-full h-full flex font-sans relative z-10">
                    {view === 'home' ? (
                        <div className="w-full h-full flex font-sans">
                            {/* Left: Custom Home Content */}
                            <div className="w-1/2 h-full bg-white flex flex-col border-r border-[#e0e0e0]">
                                <div className="h-6 bg-gradient-to-b from-[#5c9ae6] to-[#407ad6] flex items-center justify-center shadow-sm shrink-0 z-10 border-b border-[#2a5caa]">
                                    <span className="text-[12px] font-bold text-white drop-shadow-sm">iPod</span>
                                </div>
                                <div className="flex-1 flex flex-col py-2 overflow-y-auto ipod-scrollbar min-h-0 touch-pan-y"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onWheel={(e) => e.stopPropagation()}>
                                    <div className="px-2 mb-2">
                                        <p className="text-[11px] font-semibold text-black leading-tight text-center">What do you want to listen to?</p>
                                    </div>
                                    <button onClick={() => setView('liked_songs')} className="w-full bg-gradient-to-b from-[#5c9ae6] to-[#407ad6] text-white px-3 py-1 text-[11px] flex justify-between items-center font-semibold mb-1">
                                        <span>Liked Songs</span><span className="text-[10px]">›</span>
                                    </button>
                                    {user ? (
                                        playlists && playlists.length > 0 && (
                                            <div className="mt-0">
                                                {playlists.map(pl => (
                                                    <div key={pl.id} className="group relative mb-1">
                                                        <button onClick={async () => { await handleOpenPlaylist(pl.id); setViewTitle(pl.name); setView('playlist'); }}
                                                            className="w-full bg-white hover:bg-gradient-to-b hover:from-[#5c9ae6] hover:to-[#407ad6] text-black hover:text-white px-3 py-1 text-[11px] flex justify-between items-center font-semibold transition-all group/main">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                {pl.is_pinned && <Pin size={8} className="rotate-45 shrink-0 text-blue-500 group-hover/main:text-white" />}
                                                                <span className="truncate">{pl.name}</span>
                                                            </div>
                                                            <span className="text-gray-400 group-hover:text-white text-[10px]">›</span>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    ) : (
                                        <div className="mt-2 px-3 text-center">
                                            <p className="text-[10px] text-gray-500 font-medium leading-tight">Sign in to save playlists but you can play videos without signing in by pasting your yt link!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Right: Graphic */}
                            <div className="w-1/2 h-full bg-[#f2f2f2] relative flex items-center justify-center overflow-hidden">
                                {(currentVideoId || (history.length > 0 && history[history.length - 1])) ? (
                                    <button onClick={() => { setShowHome(false); }} // Resume
                                        className="relative w-full h-full flex flex-col items-center justify-center pointer-events-auto hover:opacity-90 transition-opacity">
                                        <div className="mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest scale-90">{currentVideoId ? "Now Playing" : "Last Played"}</div>
                                        <div className="w-full flex flex-col items-center justify-center" style={{ transform: 'perspective(600px) rotateY(-25deg) scale(1) translateX(-5px) translateY(5px)', transformStyle: 'preserve-3d' }}>
                                            <div className="w-32 aspect-square relative z-10 shadow-xl border border-white/20">
                                                <img src={`https://img.youtube.com/vi/${currentVideoId || history[history.length - 1]?.id}/hqdefault.jpg`} alt="Art" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="w-32 h-16 relative overflow-hidden mt-1">
                                                <img src={`https://img.youtube.com/vi/${currentVideoId || history[history.length - 1]?.id}/hqdefault.jpg`} alt="Reflection" className="w-full aspect-square object-cover scale-y-[-1] opacity-60 blur-[1px]"
                                                    style={{ maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 100%)', WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 100%)' }} />
                                            </div>
                                        </div>
                                    </button>
                                ) : (
                                    <div className="relative w-20 h-20 opacity-10"><svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-black"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg></div>
                                )}
                                <div className="absolute top-1 right-2"><Battery size={14} fill="#4ade80" className="text-gray-600" /></div>
                            </div>
                        </div>
                    ) : view === 'liked_songs' ? (
                        <div className="w-full h-full flex flex-col bg-white">
                            <div className="h-8 bg-gradient-to-b from-[#f8f8f8] to-[#e0e0e0] flex items-center px-2 border-b border-[#c0c0c0] shadow-sm shrink-0">
                                <button onClick={() => setView('home')} className="mr-2 p-1 hover:bg-black/5 rounded-full"><ChevronDown size={16} className="rotate-90 text-gray-600" /></button>
                                <span className="text-xs font-bold text-gray-800">Liked Songs</span>
                                <span className="ml-auto text-[10px] text-gray-500 font-medium">{likedSongs.length} Songs</span>
                            </div>
                            <div className="flex-1 overflow-y-auto ipod-scrollbar touch-pan-y" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
                                {likedSongs.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center"><Heart size={32} className="mb-2 opacity-20" /><p className="text-xs">No liked songs yet</p></div>
                                ) : (
                                    <ul className="divide-y divide-gray-100">
                                        {likedSongs.map((song) => (
                                            <li key={song.id} className="flex items-center gap-2 p-2 hover:bg-blue-50 transition-colors group">
                                                <button onClick={() => handlePlayFromLiked(song)} className="flex-1 flex flex-col text-left min-w-0">
                                                    <span className="text-xs font-semibold text-gray-800 truncate leading-snug">{song.title}</span>
                                                    <span className="text-[9px] text-gray-500">{song.duration ? formatTime(song.duration) : '--:--'}</span>
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleUnlikeFromList(song); }} className="p-1.5 hover:bg-red-50 rounded-full transition-colors group/heart">
                                                    <Heart size={14} className="fill-red-500 text-red-500 group-hover/heart:text-red-600" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Playlist View */
                        <div className="w-full h-full flex flex-col bg-white">
                            <div className="h-8 bg-gradient-to-b from-[#f8f8f8] to-[#e0e0e0] flex items-center px-2 border-b border-[#c0c0c0] shadow-sm shrink-0">
                                <button onClick={() => setView('home')} className="mr-2 p-1 hover:bg-black/5 rounded-full"><ChevronDown size={16} className="rotate-90 text-gray-600" /></button>
                                <span className="text-xs font-bold text-gray-800 truncate max-w-[120px]">{viewTitle}</span>
                                <span className="ml-auto text-[10px] text-gray-500 font-medium">{activePlaylistItems.length} Songs</span>
                            </div>
                            <div className="flex-1 overflow-y-auto ipod-scrollbar touch-pan-y" onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
                                {activePlaylistItems.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center"><CustomPlaylistIcon size={32} className="mb-2 opacity-20" /><p className="text-xs">No songs yet</p></div>
                                ) : (
                                    <ul className="divide-y divide-gray-100">
                                        {activePlaylistItems.map((item) => {
                                            const isItemLiked = likedSongs.some(ls => ls.video_id === item.video_id);
                                            return (
                                                <li key={item.id} className="flex items-center gap-2 p-2 hover:bg-blue-50 transition-colors group">
                                                    <button onClick={() => { playVideoFromUrl(`https://www.youtube.com/watch?v=${item.video_id}`, item.channel, item.title); }}
                                                        className="flex-1 flex flex-col text-left min-w-0">
                                                        <span className="text-xs font-semibold text-gray-800 truncate leading-snug">{item.title}</span>
                                                        <span className="text-[9px] text-gray-500">{item.duration ? formatTime(item.duration) : '--:--'}</span>
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleToggleLikeItem(item); }} className="p-1.5 hover:bg-red-50 rounded-full transition-colors group/heart">
                                                        {isItemLiked ? <Heart size={14} className="fill-red-500 text-red-500" /> : <Heart size={14} className="text-gray-300 group-hover/heart:text-red-500" />}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // --- NOW PLAYING VIEW ---
                <div className="w-full h-full flex flex-col relative z-10">
                    <div className="h-6 bg-gradient-to-b from-[#fdffff] to-[#cbe9fe] flex items-center px-1 shadow-sm shrink-0 z-10 border-b border-[#95aec5] relative">
                        <button onClick={(e) => { e.stopPropagation(); handleGoHome(); }} className="flex items-center justify-center pointer-events-auto transition-all bg-white/50 border border-white/60 p-0.5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.1)] hover:bg-white/80 hover:shadow-md active:scale-95 active:shadow-inner" title="Home">
                            <Home size={12} fill="#3b82f6" className="text-[#2563eb]" />
                        </button>
                        <div className="absolute left-1/2 -translate-x-1/2 text-[11px] font-semibold text-black drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]">Now Playing</div>
                        <div className="ml-auto"><Battery size={16} fill="#4ade80" className="text-gray-600" /></div>
                    </div>

                    <div className="flex-1 flex min-h-0 bg-white">
                        <div className="w-[140px] h-full bg-white relative shrink-0 border-r border-[#d1d5db] flex items-center justify-center overflow-hidden">
                            <div className="w-full flex flex-col" style={{ transform: 'perspective(600px) rotateY(25deg) scale(0.85) translateX(8px) translateY(24px)', transformStyle: 'preserve-3d' }}>
                                <div className="w-full aspect-square relative z-10 shadow-xl">
                                    <img src={`https://img.youtube.com/vi/${currentVideoId}/hqdefault.jpg`} alt="Album Art" className="w-full h-full object-cover" />
                                </div>
                                <div className="w-full h-16 relative overflow-hidden mt-1">
                                    <img src={`https://img.youtube.com/vi/${currentVideoId}/hqdefault.jpg`} alt="Reflection" className="w-full aspect-square object-cover scale-y-[-1] opacity-50 blur-[1px]"
                                        style={{ maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%)', WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%)' }} />
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 p-3 flex flex-col justify-center min-w-0 bg-[#f8f9fa]">
                            <h1 className="text-sm font-bold text-[#1a1a1a] leading-tight line-clamp-3 mb-1 tracking-tight">{displayTitle}</h1>
                            <h2 className="text-[11px] font-semibold text-[#555] truncate">{displayArtist}</h2>
                            <h3 className="text-[10px] text-[#888] truncate mb-auto mt-0.5">{playingSource}</h3>
                            <div className="mt-2 flex items-center justify-between">
                                <div className="text-[9px] text-[#666] font-medium tracking-wide">{(currentIndex + 1)} of {queue.length}</div>
                                <div className="flex gap-1 pointer-events-auto items-center">
                                    <button onClick={(e) => { e.stopPropagation(); onAddToPlaylist(); }} className="p-1.5 hover:scale-110 active:scale-95 transition-transform group" title="Add to Playlist">
                                        <ListMusic size={18} className="text-[#888] group-hover:text-[#666]" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); onToggleLoop(); }} className="p-1.5 hover:scale-110 active:scale-95 transition-transform group" title={isLooping ? "Disable Loop" : "Enable Loop"}>
                                        <Repeat size={18} className={`transition-colors ${isLooping ? "text-blue-500" : "text-[#888] group-hover:text-[#666]"}`} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleToggleLike(); }} className="p-1.5 hover:scale-110 active:scale-95 transition-transform group" title={isLiked ? "Remove from Liked" : "Add to Liked"}>
                                        <Heart size={18} className={`transition-colors ${isLiked ? "fill-red-500 text-red-500" : "text-[#888] group-hover:text-[#666]"}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-8 bg-[#f8f9fa] px-3 flex flex-col justify-center shrink-0 border-t border-[#e5e7eb]">
                        <div ref={progressBarRef} onClick={onSeekClick} className="w-full h-1.5 bg-[#d1d5db] rounded-sm overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] cursor-pointer hover:scale-y-150 transition-transform origin-bottom group/progress">
                            <div className="h-full bg-gradient-to-r from-[#6ba4ef] to-[#407ad6] shadow-sm relative" style={{ width: `${progress}%` }}>
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
    );
}

