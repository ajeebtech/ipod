import React, { useState, useEffect } from 'react';
import { X, Plus, ListMusic, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from "@clerk/nextjs";
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
            // Optionally show fetch error too?
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
            setErrorMessage(error.message || "Failed to create playlist. Check console.");
        }
    };

    const toggleAddToPlaylist = async (playlistId: number) => {
        if (!user || !video) return;

        const isAdded = addedToPlaylistIds.has(playlistId);

        if (isAdded) {
            // Remove
            const { error } = await supabase
                .from('playlist_items')
                .delete()
                .eq('playlist_id', playlistId)
                .eq('video_id', video.id);

            if (!error) {
                const next = new Set(addedToPlaylistIds);
                next.delete(playlistId);
                setAddedToPlaylistIds(next);
            } else {
                console.error("Error removing from playlist:", error);
                setErrorMessage("Failed to remove from playlist");
            }
        } else {
            // Add
            const { error } = await supabase
                .from('playlist_items')
                .insert({
                    playlist_id: playlistId,
                    video_id: video.id,
                    title: video.title,
                    channel: video.channel,
                    url: video.url,
                    duration: Math.round(video.duration || 0)
                });

            if (!error) {
                const next = new Set(addedToPlaylistIds);
                next.add(playlistId);
                setAddedToPlaylistIds(next);
            } else {
                console.error("Error adding to playlist:", error);
                setErrorMessage("Failed to add to playlist: " + error.message);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]"
                >
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <ListMusic size={16} className="text-blue-500" />
                            Add to Playlist
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {playlists.length === 0 && !loading && !isCreating && (
                            <div className="text-center py-8 text-gray-400 text-xs">
                                No playlists yet. Create one!
                            </div>
                        )}

                        {playlists.map(playlist => {
                            const isAdded = addedToPlaylistIds.has(playlist.id);
                            return (
                                <button
                                    key={playlist.id}
                                    onClick={() => toggleAddToPlaylist(playlist.id)}
                                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors group text-left"
                                >
                                    <span className="text-sm font-medium text-gray-700 truncate">{playlist.name}</span>
                                    {isAdded ? (
                                        <div className="bg-blue-500 text-white p-1 rounded-full">
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                    ) : (
                                        <div className="bg-gray-100 text-gray-400 p-1 rounded-full group-hover:bg-blue-100 group-hover:text-blue-500 transition-colors">
                                            <Plus size={12} strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="p-3 border-t border-gray-100 bg-gray-50/50">
                        {errorMessage && (
                            <div className="text-red-500 text-xs mb-2 px-1">
                                {errorMessage}
                            </div>
                        )}
                        {isCreating ? (
                            <form onSubmit={handleCreatePlaylist} className="flex gap-2">
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Playlist Name"
                                    value={newPlaylistName}
                                    onChange={e => {
                                        setNewPlaylistName(e.target.value);
                                        setErrorMessage(null);
                                    }}
                                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={!newPlaylistName.trim()}
                                    className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
                                >
                                    Create
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreating(false);
                                        setErrorMessage(null);
                                    }}
                                    className="text-gray-500 hover:text-gray-700 p-2"
                                >
                                    <X size={18} />
                                </button>
                            </form>
                        ) : (
                            <button
                                onClick={() => setIsCreating(true)}
                                className="w-full py-2.5 bg-white border border-dashed border-gray-300 text-gray-500 rounded-xl text-sm font-medium hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={16} />
                                New Playlist
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
