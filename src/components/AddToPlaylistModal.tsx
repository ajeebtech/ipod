import React, { useState, useEffect } from 'react';
import { X, Plus, ListMusic, Check, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser, SignInButton } from "@clerk/nextjs";
import { motion, AnimatePresence } from 'framer-motion';

interface AddToPlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    video: {
        id: string;
        title: string;
        channel: string;
        url: string;
        duration?: number;
    } | null;
}

export default function AddToPlaylistModal({ isOpen, onClose, video }: AddToPlaylistModalProps) {
    const { user } = useUser();
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(false);
    const [addedToPlaylistIds, setAddedToPlaylistIds] = useState<Set<number>>(new Set());

    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && user) {
            fetchPlaylists();
        }
    }, [isOpen, user]);

    const fetchPlaylists = async () => {
        if (!user) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('playlists')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Fetch error:", error);
        }

        if (data) {
            setPlaylists(data);
            // Check which playlists already have this song
            if (video) {
                checkSongInPlaylists(data, video.id);
            }
        }
        setLoading(false);
    };

    const checkSongInPlaylists = async (playlists: any[], videoId: string) => {
        if (!user) return;
        const playlistIds = playlists.map(p => p.id);
        if (playlistIds.length === 0) return;

        const { data } = await supabase
            .from('playlist_items')
            .select('playlist_id')
            .in('playlist_id', playlistIds)
            .eq('video_id', videoId);

        if (data) {
            setAddedToPlaylistIds(new Set(data.map(item => item.playlist_id)));
        }
    };

    const handleCreatePlaylist = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        if (!user || !newPlaylistName.trim()) return;

        try {
            const { data, error } = await supabase
                .from('playlists')
                .insert({ user_id: user.id, name: newPlaylistName.trim() })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setPlaylists([data, ...playlists]);
                setNewPlaylistName('');
                setIsCreating(false);
            }
        } catch (error: any) {
            console.error('Error creating playlist:', error);
            setErrorMessage(error.message || "Failed to create playlist.");
        }
    };

    const toggleAddToPlaylist = async (playlistId: number) => {
        if (!user || !video) return;
        setErrorMessage(null);

        try {
            const isAdded = addedToPlaylistIds.has(playlistId);

            if (isAdded) {
                // Remove
                const { error } = await supabase
                    .from('playlist_items')
                    .delete()
                    .eq('playlist_id', playlistId)
                    .eq('video_id', video.id);

                if (error) throw error;

                setAddedToPlaylistIds(prev => {
                    const next = new Set(prev);
                    next.delete(playlistId);
                    return next;
                });
            } else {
                // Add
                const { error } = await supabase
                    .from('playlist_items')
                    .insert({
                        playlist_id: playlistId,
                        video_id: video.id,
                        title: video.title,
                        url: video.url,
                        channel: video.channel,
                        duration: video.duration ? Math.round(video.duration) : 0
                    });

                if (error) throw error;

                setAddedToPlaylistIds(prev => new Set(prev).add(playlistId));
            }
        } catch (error: any) {
            console.error("Error toggling playlist item:", error);
            setErrorMessage(error.message || "Failed to update playlist.");
        }
    };

    if (!isOpen) return null;

    // --- Sign In Required Modal (Apple Style) ---
    if (!user) {
        return (
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="absolute inset-0 bg-black/20 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 10 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-[320px] bg-white/90 backdrop-blur-xl rounded-[24px] shadow-2xl overflow-hidden border border-white/40"
                        >
                            <div className="p-8 flex flex-col items-center text-center">
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-500/30">
                                    <ListMusic size={28} className="text-white" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-2 tracking-tight">Sign in Required</h2>
                                <p className="text-[13px] text-gray-500 mb-8 leading-relaxed font-medium">
                                    Please sign in to create and manage your playlists.
                                </p>
                                <div className="flex flex-col gap-3 w-full">
                                    <SignInButton mode="modal">
                                        <button className="w-full py-3 text-[15px] font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-500/20">
                                            Sign In
                                        </button>
                                    </SignInButton>
                                    <button
                                        onClick={onClose}
                                        className="w-full py-3 text-[15px] font-semibold text-gray-900 bg-gray-100 rounded-xl hover:bg-gray-200 active:scale-[0.98] transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        );
    }

    // --- Main Playlist Modal (Apple Style) ---
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/20 backdrop-blur-md" // Lighter, blurrier backdrop
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white/80 backdrop-blur-xl rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[70vh] relative z-10 border border-white/50"
                    >
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-gray-200/50 flex items-center justify-between bg-white/50">
                            <h2 className="text-[15px] font-semibold text-gray-900">
                                Add to Playlist
                            </h2>
                            <button
                                onClick={onClose}
                                className="w-7 h-7 flex items-center justify-center bg-gray-200/50 rounded-full text-gray-500 hover:bg-gray-300/50 hover:text-gray-900 transition-colors"
                            >
                                <X size={14} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-1">
                            {playlists.length === 0 && !loading && !isCreating && (
                                <div className="text-center py-10">
                                    <p className="text-gray-400 text-sm font-medium">No playlists found</p>
                                </div>
                            )}

                            {playlists.map(playlist => {
                                const isAdded = addedToPlaylistIds.has(playlist.id);
                                return (
                                    <button
                                        key={playlist.id}
                                        onClick={() => toggleAddToPlaylist(playlist.id)}
                                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/60 rounded-xl transition-all group text-left active:scale-[0.98]"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isAdded ? 'bg-blue-500 text-white shadow-blue-500/30 shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
                                                <ListMusic size={20} />
                                            </div>
                                            <span className={`text-[15px] font-medium truncate ${isAdded ? 'text-blue-600' : 'text-gray-900'}`}>
                                                {playlist.name}
                                            </span>
                                        </div>

                                        {isAdded ? (
                                            <div className="text-blue-500">
                                                <Check size={18} strokeWidth={2.5} />
                                            </div>
                                        ) : (
                                            <div className="opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity">
                                                <Plus size={18} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer (Create New) */}
                        <div className="p-4 border-t border-gray-200/50 bg-white/50 backdrop-blur-sm">
                            {errorMessage && (
                                <div className="text-red-500 text-[11px] font-medium mb-3 px-1 text-center bg-red-50 py-1.5 rounded-lg border border-red-100">
                                    {errorMessage}
                                </div>
                            )}
                            {isCreating ? (
                                <form onSubmit={handleCreatePlaylist} className="flex gap-2 items-center">
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Playlist Name"
                                        value={newPlaylistName}
                                        onChange={e => {
                                            setNewPlaylistName(e.target.value);
                                            setErrorMessage(null);
                                        }}
                                        className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newPlaylistName.trim()}
                                        className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-[14px] font-semibold disabled:opacity-50 hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20 active:scale-95"
                                    >
                                        Create
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCreating(false);
                                            setErrorMessage(null);
                                        }}
                                        className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </form>
                            ) : (
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-[14px] font-semibold hover:border-blue-300 hover:text-blue-600 hover:shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                >
                                    <Plus size={16} strokeWidth={2.5} />
                                    New Playlist
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
