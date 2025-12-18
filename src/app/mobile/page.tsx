'use client';

import React, { useState } from 'react';
import IpodScreenUI from '@/components/IpodScreenUI';
import { useIpodState } from '@/hooks/useIpodState';
import MiniPlayer from '@/components/MiniPlayer';
import AddToPlaylistModal from '@/components/AddToPlaylistModal';
import CustomUserMenu from '@/components/CustomUserMenu';

import { Search } from 'lucide-react';

export default function MobileIpodPage() {
    const ipodState = useIpodState();
    const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Hardcoded styling to mimic iPod Body roughly or just focus on screen?
    // User asked for "just with a 2d ipod".
    // I'll make a simple dark frame.

    return (
        <div className="fixed inset-0 bg-[#f0f0f0] flex flex-col items-center justify-center overscroll-none touch-none">
            {/* User Menu Top Right */}
            <div className="absolute top-4 right-4 z-50">
                <CustomUserMenu />
            </div>

            {/* Search Bar (Mobile Version) */}
            <form
                onSubmit={(e) => { e.preventDefault(); ipodState.handleConfirm(); }}
                className="absolute top-4 left-4 right-16 z-[100]"
            >
                <div className={`relative backdrop-blur-xl bg-white/70 rounded-2xl border border-white/50 shadow-lg transition-all duration-300 ease-out ${isFocused ? "shadow-xl bg-white/90" : ""}`}>
                    <div className="relative flex items-center">
                        <div className="pl-3 pr-2">
                            <Search className={`w-4 h-4 transition-colors duration-200 ${isFocused ? "text-stone-600" : "text-stone-400"}`} />
                        </div>
                        <input
                            ref={ipodState.inputRef as React.RefObject<HTMLInputElement>}
                            type="text"
                            placeholder="Search YouTube"
                            value={ipodState.videoUrl}
                            onChange={(e) => {
                                ipodState.setVideoUrl(e.target.value);
                                if (ipodState.searchTimeoutRef.current) clearTimeout(ipodState.searchTimeoutRef.current);
                                if (e.target.value.trim().length > 2) {
                                    ipodState.searchTimeoutRef.current = setTimeout(() => ipodState.handleConfirm(), 500);
                                } else if (e.target.value.trim().length === 0) {
                                    ipodState.setSearchResults([]);
                                }
                            }}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                            className="flex-1 bg-transparent py-2.5 pr-2 text-stone-800 text-sm font-light focus:outline-none"
                        />
                        {/* Results Dropdown */}
                        {ipodState.searchResults.length > 0 && isFocused && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden divide-y divide-gray-100 p-1 z-[201] max-h-[60vh] overflow-y-auto">
                                {ipodState.searchResults.map((result) => (
                                    <button
                                        key={result.id}
                                        onClick={() => {
                                            ipodState.playVideoFromUrl(`https://www.youtube.com/watch?v=${result.id}`, result.channel, result.title);
                                            ipodState.setSearchResults([]);
                                            ipodState.setVideoUrl('');
                                        }}
                                        className="w-full flex items-center gap-3 p-2 hover:bg-black/5 rounded-xl transition-colors text-left"
                                    >
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 shrink-0 relative">
                                            <img src={result.thumbnail} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-medium text-gray-900 truncate" dangerouslySetInnerHTML={{ __html: result.title }} />
                                            <div className="text-[10px] text-gray-500 truncate">{result.channel}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </form>

            {/* Main iPod Container (2D Representation) */}
            <div className="relative w-[85vw] max-w-[400px] aspect-[2/3] bg-gradient-to-br from-gray-200 to-gray-400 rounded-[50px] shadow-2xl flex flex-col items-center p-6 border-4 border-white/40 ring-1 ring-black/10">

                {/* Screen Area */}
                <div className="w-full aspect-[4/3] bg-black rounded-lg border-4 border-[#333] shadow-inner mb-8 overflow-hidden relative">
                    {/* The Screen UI */}
                    <div className="w-full h-full relative">
                        <IpodScreenUI
                            {...ipodState}
                            onAddToPlaylist={() => setIsPlaylistModalOpen(true)}
                        />
                    </div>
                    {/* Screen reflection overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-lg" />
                </div>

                {/* Click Wheel Area */}
                <div className="relative w-48 h-48 rounded-full bg-white flex items-center justify-center shadow-lg active:scale-[0.99] transition-transform">
                    {/* Center Button (Select/Play) */}
                    <button
                        className="w-16 h-16 rounded-full bg-gray-200 shadow-inner active:bg-gray-300 outline-none cursor-pointer z-10"
                        onClick={() => ipodState.togglePlayPause()}
                    />

                    {/* Top: Menu */}
                    <button
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-12 flex items-start justify-center pt-2 outline-none cursor-pointer z-10"
                        onClick={() => ipodState.handleGoHome()}
                    >
                        <span className="text-[10px] font-bold text-gray-400">MENU</span>
                    </button>

                    {/* Bottom: Play/Pause */}
                    <button
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-12 flex items-end justify-center pb-2 outline-none cursor-pointer z-10"
                        onClick={() => ipodState.togglePlayPause()}
                    >
                        <span className="text-[10px] font-bold text-gray-400">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5V19L19 12L8 5Z" /></svg>
                        </span>
                    </button>

                    {/* Left: Prev */}
                    <button
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-16 w-12 flex items-center justify-start pl-2 outline-none cursor-pointer z-10"
                        onClick={() => ipodState.playPrev()}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 19V5M19 12H5M5 5L5 19" strokeWidth={2} /></svg>
                    </button>

                    {/* Right: Next */}
                    <button
                        className="absolute right-0 top-1/2 -translate-y-1/2 h-16 w-12 flex items-center justify-end pr-2 outline-none cursor-pointer z-10"
                        onClick={() => ipodState.playNext()}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M5 5V19M19 5L5 19" strokeWidth={2} /></svg>
                    </button>
                </div>

            </div>

            {/* Show MiniPlayer on mobile too? The className above hid it on small screens? `hidden md:block`?
                No, I want it VISIBLE. 
                I'll use the same class as Ipod3D mobile logic.
            */}
            <div className="absolute z-40 bottom-24 right-4 w-[240px] scale-90 origin-bottom-right sm:bottom-20 sm:right-5 sm:w-64">
                <MiniPlayer
                    videoId={ipodState.currentVideoId || ''}
                    title={ipodState.queue[ipodState.currentIndex]?.title || ''}
                    artist={ipodState.queue[ipodState.currentIndex]?.channel || ''}
                    progress={ipodState.progress}
                    currentTime={ipodState.currentTime}
                    duration={ipodState.duration}
                    isPaused={ipodState.isPaused}
                    onTogglePlay={ipodState.togglePlayPause}
                    onResume={() => { ipodState.setHasStarted(true); ipodState.togglePlayPause(); }}
                />
            </div>

            {/* Modals */}
            <AddToPlaylistModal
                isOpen={isPlaylistModalOpen}
                onClose={() => setIsPlaylistModalOpen(false)}
                video={ipodState.currentIndex >= 0 && ipodState.queue[ipodState.currentIndex] ? {
                    id: ipodState.queue[ipodState.currentIndex].id,
                    title: ipodState.queue[ipodState.currentIndex].title,
                    channel: ipodState.queue[ipodState.currentIndex].channel,
                    url: ipodState.queue[ipodState.currentIndex].url || `https://www.youtube.com/watch?v=${ipodState.queue[ipodState.currentIndex].id}`,
                    duration: ipodState.duration
                } : null}
            />
        </div>
    );
}
