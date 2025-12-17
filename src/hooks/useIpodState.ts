
import { useState, useRef, useEffect, useCallback } from 'react';
import { YouTubePlayer } from 'react-youtube';
import { searchYouTube, YouTubeVideo } from '../lib/youtube-search';
import { useUser } from "@clerk/nextjs";
import { supabase } from '../lib/supabase';
import { fetchPlaylistItems, fetchVideoDetails } from '../lib/youtube-api';
import { usePlayer } from '../context/PlayerContext';

export interface IpodState {
    // State
    hasStarted: boolean;
    setHasStarted: (v: boolean) => void;
    showHome: boolean;
    setShowHome: (v: boolean) => void;
    videoUrl: string;
    setVideoUrl: (v: string) => void;
    isSearching: boolean;
    searchResults: YouTubeVideo[];
    setSearchResults: (v: YouTubeVideo[]) => void;
    searchError: string | null;
    queue: any[];
    history: any[];
    likedSongs: any[];
    playlists: any[];
    activePlaylistItems: any[];
    currentVideoId: string | null;
    currentIndex: number;
    isPlaying: boolean;
    isPaused: boolean;
    isMuted: boolean;
    volume: number;
    progress: number;
    currentTime: number;
    duration: number;
    isLooping: boolean;
    playingSource: 'From URL' | 'History' | 'Liked Songs';
    isLiked: boolean;
    user: any;
    isSignedIn: boolean;
    dontAskAgain: boolean;
    setDontAskAgain: (v: boolean) => void;

    // Refs
    playerRef: React.MutableRefObject<YouTubePlayer | null>;
    inputRef: React.RefObject<HTMLInputElement | null>;
    searchTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;

    // Handlers
    handleConfirm: () => Promise<void>;
    handleSkip: () => void;
    togglePlayPause: () => void;
    handleSeek: (seconds: number) => void;
    playNext: () => void;
    playPrev: () => void;
    handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    toggleMute: () => void;
    playHistoryItem: (index: number) => Promise<void>;
    handlePlayFromLiked: (song: any) => Promise<void>;
    handleUnlikeFromList: (song: any) => Promise<void>;
    handleToggleLikeItem: (item: any) => Promise<void>;
    handleGoHome: () => void;
    handleToggleLike: () => Promise<void>;
    handleOpenPlaylist: (playlistId: number) => Promise<void>;
    playVideoFromUrl: (url: string, channelName?: string, videoTitle?: string) => Promise<void>;
    handlePlayerReady: (player: YouTubePlayer) => void;
    handleStateChange: (event: any) => void;
    onToggleLoop: () => void;
    onAddToPlaylist: () => void;

    // UI Helpers
    formatTime: (seconds: number) => string;
}

export function useIpodState() {
    const { user, isSignedIn } = useUser();

    // --- State ---
    const [hasStarted, setHasStarted] = useState(false);
    const [showHome, setShowHome] = useState(false); // Initially false (Player View or Input View)

    // Queue & Playback
    const [queue, setQueue] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [playingSource, setPlayingSource] = useState<'From URL' | 'History' | 'Liked Songs'>('History');
    const [isLooping, setIsLooping] = useState(false);

    // Player State
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(100);
    const [isMuted, setIsMuted] = useState(false);
    const [isLiked, setIsLiked] = useState(false);

    // Data
    const [likedSongs, setLikedSongs] = useState<any[]>([]);
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [activePlaylistItems, setActivePlaylistItems] = useState<any[]>([]);

    // Search
    const [videoUrl, setVideoUrl] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [dontAskAgain, setDontAskAgain] = useState(false);

    // Refs
    const playerRef = useRef<YouTubePlayer | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Context Hooks
    const { setHistory: setCtxHistory, setQueue: setCtxQueue, setCurrentIndex: setCtxCurrentIndex, registerPlayHandler } = usePlayer();

    // Computed
    const currentVideoId = currentIndex >= 0 && queue[currentIndex] ? queue[currentIndex].id : null;

    // --- Effects ---

    // Sync to Context
    useEffect(() => { setCtxHistory(history); }, [history, setCtxHistory]);
    useEffect(() => { setCtxQueue(queue); }, [queue, setCtxQueue]);
    useEffect(() => { setCtxCurrentIndex(currentIndex); }, [currentIndex, setCtxCurrentIndex]);
    useEffect(() => { setIsLooping(false); }, [currentVideoId]);

    // Load Prefs
    useEffect(() => {
        const skipStart = localStorage.getItem('ipod-skip-start');
        if (skipStart === 'true') setHasStarted(true);
    }, []);

    const savePreference = () => {
        if (dontAskAgain) localStorage.setItem('ipod-skip-start', 'true');
    };

    // --- Data Fetching ---
    useEffect(() => {
        if (isSignedIn && user) {
            const fetchHistory = async () => {
                const { data } = await supabase.from('history').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
                if (data) {
                    const mappedHistory = data.map((item: any) => {
                        let playlistId = item.playlist_id;
                        let playlistTitle = item.playlist_title;
                        if (!playlistId) {
                            const listMatch = item.url.match(/[?&]list=([^#&?]+)/);
                            playlistId = listMatch ? listMatch[1] : undefined;
                        }
                        if (playlistId && !playlistTitle) playlistTitle = 'Playlist';
                        return {
                            id: item.video_id, url: item.url, title: item.title, channel: item.channel,
                            dbId: item.id, fromPlaylist: !!playlistId, playlistId, playlistTitle
                        };
                    });
                    if (mappedHistory.length > 0) {
                        setHistory(mappedHistory);
                        setQueue(prev => prev.length === 0 ? mappedHistory : prev);
                        setHasStarted(true);
                        setCurrentIndex(prev => prev === -1 ? mappedHistory.length - 1 : prev);
                    }
                }
            };
            fetchHistory();
        }
    }, [isSignedIn, user]);

    // Liked Status Check
    useEffect(() => {
        const checkLikedStatus = async () => {
            if (!isSignedIn || !user || currentIndex < 0 || !queue[currentIndex]) {
                setIsLiked(false);
                return;
            }
            const currentItem = queue[currentIndex];
            const { data } = await supabase.from('liked_songs').select('id').eq('user_id', user.id).eq('video_id', currentItem.id).single();
            setIsLiked(!!data);
        };
        checkLikedStatus();
    }, [currentIndex, queue, isSignedIn, user]);

    // Fetch Lists
    useEffect(() => {
        if (isSignedIn && user) {
            const fetchLiked = async () => {
                const { data } = await supabase.from('liked_songs').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
                if (data) setLikedSongs(data);
            };
            const fetchPls = async () => {
                const { data } = await supabase.from('playlists').select('*').eq('user_id', user.id).order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
                if (data) setPlaylists(data);
            };
            fetchLiked();
            fetchPls();
        }
    }, [isSignedIn, user]); // Note: In Ipod3D this also depended on isPlaylistModalOpen, might need to expose a refresh

    // Register Context Handler
    useEffect(() => {
        registerPlayHandler((type, index) => {
            if (type === 'history') playHistoryItem(index);
            else if (type === 'queue') setCurrentIndex(index);
        });
    }, [registerPlayHandler, history, queue, playingSource]);

    // --- Actions ---

    const handlePlayerReady = (player: YouTubePlayer) => {
        playerRef.current = player;
        if (player.getPlayerState() !== 1) player.playVideo();
    };

    const handleStateChange = async (event: any) => {
        if (event.data === 1) { // Playing
            setIsPlaying(true);
            if (playerRef.current) {
                const data = playerRef.current.getVideoData();
                if (data && data.author && currentIndex >= 0 && queue[currentIndex]) {
                    const currentItem = queue[currentIndex];
                    const author = data.author;
                    if (author && currentItem.channel !== author) {
                        // Update Queue & History & DB
                        setQueue(prev => {
                            const newQueue = [...prev];
                            if (newQueue[currentIndex]) newQueue[currentIndex] = { ...newQueue[currentIndex], channel: author };
                            return newQueue;
                        });
                        setHistory(prev => {
                            const newHistory = [...prev];
                            const idx = newHistory.findIndex(h => h.id === currentItem.id);
                            if (idx !== -1) newHistory[idx] = { ...newHistory[idx], channel: author };
                            return newHistory;
                        });
                        if (isSignedIn && user) {
                            await supabase.from('history').update({ channel: author }).eq('user_id', user.id).eq('video_id', currentItem.id);
                        }
                    }
                }
            }
        }
        if (event.data === 2) setIsPlaying(false);
        if (event.data === 0) { // Ended
            setIsPlaying(false);
            if (isLooping) {
                event.target.seekTo(0);
                event.target.playVideo();
                return;
            }
            if (currentIndex < queue.length - 1) {
                const nextItem = queue[currentIndex + 1];
                if (playingSource === 'Liked Songs' || (nextItem && nextItem.fromPlaylist)) {
                    playNext();
                }
            }
        }

        // Title update logic
        const player = event.target;
        if (player && player.getVideoData && currentIndex >= 0) {
            const data = player.getVideoData();
            const currentItem = queue[currentIndex];
            if (data && (data.title || data.author) && currentItem) {
                const titleChanged = data.title && (currentItem.title === 'Loading title...' || currentItem.title !== data.title);
                const channelChanged = data.author && currentItem.channel !== data.author;
                if (titleChanged || channelChanged) {
                    setQueue(prev => {
                        const newQueue = [...prev];
                        newQueue[currentIndex] = { ...newQueue[currentIndex], title: data.title || newQueue[currentIndex].title, channel: data.author || newQueue[currentIndex].channel };
                        return newQueue;
                    });
                    if (currentItem.dbId && isSignedIn && user) {
                        await supabase.from('history').update({ title: data.title, channel: data.author }).eq('id', currentItem.dbId);
                    }
                    setHistory(prev => prev.map(h => {
                        const isMatch = currentItem.dbId ? h.dbId === currentItem.dbId : h.id === currentItem.id;
                        return isMatch ? { ...h, title: data.title || h.title, channel: data.author || h.channel } : h;
                    }));
                }
            }
        }
    };

    // Function to play video from URL (Complex logic)
    const playVideoFromUrl = async (url: string, channelName?: string, videoTitle?: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const listRegExp = /[?&]list=([^#&?]+)/;
        const match = url.match(regExp);
        const listMatch = url.match(listRegExp);

        if (listMatch && listMatch[1]) {
            savePreference();
            const playlistId = listMatch[1];
            const playlistItems = await fetchPlaylistItems(playlistId);
            if (playlistItems.items.length > 0) {
                const newIds = new Set(playlistItems.items.map((i: any) => i.id));
                let dbItems: any[] = [];
                if (isSignedIn && user) {
                    await supabase.from('history').delete().eq('user_id', user.id).in('video_id', Array.from(newIds));
                    const itemsToInsert = playlistItems.items.map((item: any) => ({
                        user_id: user.id, video_id: item.id, url: item.url, title: item.title, channel: item.channel, playlist_id: playlistId, playlist_title: playlistItems.title
                    }));
                    const { data } = await supabase.from('history').insert(itemsToInsert).select();
                    if (data) dbItems = data;
                }
                setHistory(prev => {
                    const filtered = prev.filter(item => !newIds.has(item.id));
                    const newHistoryItems = playlistItems.items.map((item: any) => {
                        const dbItem = dbItems.find((d: any) => d.video_id === item.id);
                        return { id: item.id, url: item.url, title: item.title, channel: item.channel, dbId: dbItem?.id, fromPlaylist: true, playlistId, playlistTitle: playlistItems.title };
                    });
                    const nextHistory = [...filtered, ...newHistoryItems];
                    setQueue(nextHistory);
                    let jumpIndex = nextHistory.length - newHistoryItems.length;
                    if (match && match[2] && match[2].length === 11) {
                        const specificIndex = nextHistory.findIndex(h => h.id === match[2]);
                        if (specificIndex !== -1) jumpIndex = specificIndex;
                    }
                    setCurrentIndex(jumpIndex);
                    return nextHistory;
                });
                setVideoUrl(''); setHasStarted(true); setPlayingSource('From URL');
                return;
            } else {
                alert("Could not load playlist.");
            }
        }

        if (match && match[2].length === 11) {
            savePreference();
            const newId = match[2];
            let title = videoTitle || 'Loading title...';
            let channel = channelName;
            if ((!videoTitle || videoTitle === 'Loading title...' || !channel) && newId) {
                try {
                    const details = await fetchVideoDetails(newId);
                    if (details) { title = details.title; channel = details.channel; }
                } catch (err) { console.error(err); }
            }
            setHistory(prev => {
                const filtered = prev.filter(item => item.id !== newId);
                const newItem = { id: newId, url: url, title: title, channel: channel, dbId: undefined, fromPlaylist: false };
                const nextHistory = [...filtered, newItem];
                setQueue(nextHistory);
                setCurrentIndex(nextHistory.length - 1);
                return nextHistory;
            });
            setVideoUrl(''); setHasStarted(true); setPlayingSource('From URL'); setShowHome(false);
            if (isSignedIn && user) {
                await supabase.from('history').delete().eq('user_id', user.id).eq('video_id', newId);
                const { data } = await supabase.from('history').insert([{ user_id: user.id, video_id: newId, url, title, channel }]).select();
                if (data && data[0]) setHistory(prev => prev.map(item => item.id === newId ? { ...item, dbId: data[0].id } : item));
            }
        }
    };

    const handleConfirm = async () => {
        if (videoUrl.trim()) {
            setIsSearching(true); setSearchError(null);
            const { items, error } = await searchYouTube(videoUrl);
            if (error) { setSearchError(error); setIsSearching(false); return; }
            if (!items || items.length === 0) { setSearchError("No results found"); setIsSearching(false); return; }
            setSearchResults(items); setIsSearching(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    // Playback Controls
    const handleSkip = () => { savePreference(); setHasStarted(true); };
    const togglePlayPause = () => {
        if (playerRef.current) {
            if (isPlaying) playerRef.current.pauseVideo();
            else playerRef.current.playVideo();
        }
    };
    const handleSeek = (seconds: number) => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
            playerRef.current.seekTo(playerRef.current.getCurrentTime() + seconds, true);
        }
    };
    // Explicit seek to Time
    const seekToTime = (time: number) => {
        if (playerRef.current && playerRef.current.seekTo) {
            playerRef.current.seekTo(time, true);
        }
    }
    const playNext = () => { if (currentIndex < queue.length - 1) setCurrentIndex(prev => prev + 1); };
    const playPrev = () => { if (currentIndex > 0) setCurrentIndex(prev => prev - 1); };
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseInt(e.target.value);
        setVolume(newVolume);
        if (playerRef.current) {
            playerRef.current.setVolume(newVolume);
            if (newVolume > 0 && isMuted) { setIsMuted(false); playerRef.current.unMute(); }
        }
    };
    const toggleMute = () => {
        if (playerRef.current) {
            if (isMuted) { playerRef.current.unMute(); setIsMuted(false); if (volume === 0) { setVolume(100); playerRef.current.setVolume(100); } }
            else { playerRef.current.mute(); setIsMuted(true); }
        }
    };

    // Navigation & Interaction
    const playHistoryItem = async (index: number) => {
        const itemToPlay = history[index];
        if (!itemToPlay) return;
        const newHistory = [...history];
        newHistory.splice(index, 1);
        newHistory.push(itemToPlay);
        setHistory(newHistory);
        const reversedHistory = [...newHistory].reverse();
        setQueue(reversedHistory);
        setCurrentIndex(0);
        setPlayingSource('History'); setShowHome(false); setHasStarted(true);
        if (isSignedIn && user && itemToPlay.dbId) {
            await supabase.from('history').update({ created_at: new Date().toISOString() }).eq('id', itemToPlay.dbId);
        }
    };

    const handlePlayFromLiked = async (song: any) => {
        const likedQueue = likedSongs.map(s => ({
            id: s.video_id, url: s.url, title: s.title, channel: s.channel, dbId: undefined, fromPlaylist: false, isLikedItem: true
        }));
        setQueue(likedQueue);
        const idx = likedQueue.findIndex(q => q.id === song.video_id);
        setCurrentIndex(idx !== -1 ? idx : 0);
        setHasStarted(true); setPlayingSource('Liked Songs'); setShowHome(false);
        // Sync history logic elided for brevity but can be added if crucial
    };

    const handleUnlikeFromList = async (song: any) => {
        if (!user) return;
        setLikedSongs(prev => prev.filter(s => s.id !== song.id));
        if (playingSource === 'Liked Songs') {
            setQueue(prev => {
                const newQueue = prev.filter(q => q.id !== song.video_id);
                if (currentIndex >= newQueue.length) setCurrentIndex(Math.max(0, newQueue.length - 1));
                return newQueue;
            });
        }
        if (currentIndex >= 0 && queue[currentIndex] && queue[currentIndex].id === song.video_id) setIsLiked(false);
        await supabase.from('liked_songs').delete().eq('user_id', user.id).eq('id', song.id);
    };

    const handleToggleLikeItem = async (playlistItem: any) => {
        if (!user) return;
        const existingLike = likedSongs.find(ls => ls.video_id === playlistItem.video_id);
        if (existingLike) {
            handleUnlikeFromList(existingLike);
        } else {
            const newLike = {
                user_id: user.id, video_id: playlistItem.video_id, title: playlistItem.title,
                url: playlistItem.url || `https://www.youtube.com/watch?v=${playlistItem.video_id}`,
                channel: playlistItem.channel, duration: playlistItem.duration
            };
            const tempId = Date.now();
            setLikedSongs(prev => [{ ...newLike, id: tempId, created_at: new Date().toISOString() }, ...prev]);
            if (currentIndex >= 0 && queue[currentIndex] && queue[currentIndex].id === playlistItem.video_id) setIsLiked(true);
            const { data } = await supabase.from('liked_songs').upsert(newLike).select().single();
            if (data) setLikedSongs(prev => prev.map(p => p.id === tempId ? data : p));
        }
    };

    const handleGoHome = () => {
        if (currentVideoId) setShowHome(true);
        else { setCurrentIndex(-1); setIsPlaying(false); setPlayingSource('History'); setQueue(history); }
    };

    const handleToggleLike = async () => {
        if (!isSignedIn || !user || currentIndex < 0 || !queue[currentIndex]) return;
        const currentItem = queue[currentIndex];
        if (isLiked) {
            setIsLiked(false); setLikedSongs(prev => prev.filter(s => s.video_id !== currentItem.id));
            await supabase.from('liked_songs').delete().eq('user_id', user.id).eq('video_id', currentItem.id);
        } else {
            setIsLiked(true);
            const newLike = { user_id: user.id, video_id: currentItem.id, title: currentItem.title, url: currentItem.url, channel: currentItem.channel };
            setLikedSongs(prev => [{ ...newLike, id: Date.now() }, ...prev]);
            await supabase.from('liked_songs').insert(newLike);
        }
    };

    const handleOpenPlaylist = async (playlistId: number) => {
        if (!user) return;
        const { data } = await supabase.from('playlist_items').select('*').eq('playlist_id', playlistId).order('added_at', { ascending: false });
        if (data) setActivePlaylistItems(data);
    };

    const onToggleLoop = () => setIsLooping(!isLooping);

    // Progress Loop
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
                        setIsPaused(state !== 1 && state !== 3);
                    }
                }
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Format helper
    const formatTime = (seconds: number) => {
        const m = Math.floor(Math.abs(seconds) / 60);
        const s = Math.floor(Math.abs(seconds) % 60);
        return `${seconds < 0 ? '-' : ''}${m}:${s.toString().padStart(2, '0')}`;
    };

    return {
        // State
        hasStarted, setHasStarted, showHome, setShowHome,
        videoUrl, setVideoUrl, isSearching, searchResults, setSearchResults, searchError,
        queue, history, likedSongs, playlists, activePlaylistItems,
        currentVideoId, currentIndex, isPlaying, isPaused, isMuted, volume,
        progress, currentTime, duration, isLooping, playingSource, isLiked,
        user, isSignedIn, dontAskAgain, setDontAskAgain,

        // Refs
        playerRef, inputRef, searchTimeoutRef,

        // Actions
        handleConfirm, handleSkip, togglePlayPause, handleSeek, seekToTime,
        playNext, playPrev, handleVolumeChange, toggleMute,
        playHistoryItem, handlePlayFromLiked, handleUnlikeFromList, handleToggleLikeItem,
        handleGoHome, handleToggleLike, handleOpenPlaylist,
        playVideoFromUrl, handlePlayerReady, handleStateChange,
        onToggleLoop,
        onAddToPlaylist: () => { }, // Handled by UI modal, but state hook could expose logic if needed. 
        // Note: Playlist Modal state is currently local to component because it's just open/close. 
        // But Ipod3D passes `onAddToPlaylist` prop to ScreenOverlay.
        // ScreenOverlay calls it. 
        // We can keep it in the hook or just return a dummy if the UI handles it separately. 
        // Let's assume the UI component will take `setIsPlaylistModalOpen` or similar. 
        // For now, Ipod3D has it. I should probably move `isPlaylistModalOpen` to hook or props.

        formatTime
    };
}
