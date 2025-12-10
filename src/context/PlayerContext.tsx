"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

// Define the shape of a history/queue item based on Ipod3D usage
export interface SongItem {
    id: string; // YouTube ID
    url: string;
    title: string;
    dbId?: number;
    fromPlaylist?: boolean;
    playlistId?: string;
    playlistTitle?: string;
    channel?: string;
}

interface PlayerContextType {
    history: SongItem[];
    queue: SongItem[];
    currentIndex: number;
    currentSong: SongItem | null;
    isPlaying: boolean;

    // Actions to be called by Ipod3D to update context
    setHistory: (history: SongItem[]) => void;
    setQueue: (queue: SongItem[]) => void;
    setCurrentIndex: (index: number) => void;
    setIsPlaying: (isPlaying: boolean) => void;

    // Actions called by Drawers to control playback
    playSongFromHistory: (index: number) => void;
    playSongFromQueue: (index: number) => void; // index in the full queue array

    // Callback registration for Ipod3D to listen to drawer requests
    onPlayRequest: (type: 'history' | 'queue', index: number) => void;
    registerPlayHandler: (handler: (type: 'history' | 'queue', index: number) => void) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
    const [history, setHistory] = useState<SongItem[]>([]);
    const [queue, setQueue] = useState<SongItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState(false);

    const [playHandler, setPlayHandler] = useState<((type: 'history' | 'queue', index: number) => void) | null>(null);

    const currentSong = queue[currentIndex] || null;

    const registerPlayHandler = (handler: (type: 'history' | 'queue', index: number) => void) => {
        setPlayHandler(() => handler);
    };

    const onPlayRequest = (type: 'history' | 'queue', index: number) => {
        if (playHandler) {
            playHandler(type, index);
        } else {
            console.warn("No play handler registered in PlayerContext");
        }
    };

    const playSongFromHistory = (index: number) => {
        onPlayRequest('history', index);
    };

    const playSongFromQueue = (index: number) => {
        onPlayRequest('queue', index);
    };

    return (
        <PlayerContext.Provider
            value={{
                history,
                queue,
                currentIndex,
                currentSong,
                isPlaying,
                setHistory,
                setQueue,
                setCurrentIndex,
                setIsPlaying,
                playSongFromHistory,
                playSongFromQueue,
                onPlayRequest,
                registerPlayHandler,
            }}
        >
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const context = useContext(PlayerContext);
    if (context === undefined) {
        throw new Error("usePlayer must be used within a PlayerProvider");
    }
    return context;
}
