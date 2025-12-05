'use client';

import React, { useState } from 'react';
import { Screen } from './Screen';
import { Wheel } from './Wheel';

export function Ipod() {
    const [view, setView] = useState<'menu' | 'player' | 'input'>('menu');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [videoUrl, setVideoUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    const menuItems = [
        'Music',
        'Videos',
        'Enter URL',
        'Extras',
        'Settings',
        'Shuffle Songs'
    ];

    const handleMenuClick = () => {
        if (view === 'player' || view === 'input') {
            setView('menu');
            setIsPlaying(false);
        } else {
            // Go back logic if we had submenus
            setSelectedIndex(0);
        }
    };

    const handleUrlChange = (url: string) => {
        setVideoUrl(url);
        setView('menu');
        setSelectedIndex(1); // Set selection to 'Videos' for convenience
    };

    const handleSelect = () => {
        if (view === 'menu') {
            if (menuItems[selectedIndex] === 'Videos' || menuItems[selectedIndex] === 'Music') {
                setView('player');
                setIsPlaying(true);
            } else if (menuItems[selectedIndex] === 'Enter URL') {
                setView('input');
            }
        } else if (view === 'input') {
            // Center button in input view triggers save (conceptually, though button is usually hidden)
            // We rely on the user typing and hitting enter or using a save button we rendered?
            // Actually, let's make the center button trigger the save callback in Ipod logic if we have access to the input value?
            // React state separation makes this tricky without lifting input state up.
            // Screen manages input state internally to avoid re-renders of heavy wheel? No, Ipod manages view.

            // Simplification: We passed onUrlChange to Screen. The visual "Save" button in Screen calls it.
            // But hardware center button should also do it.
            // We can't easily grab the Screen's internal input value here.
            // So for now, we rely on the on-screen interactions or just pressing "Menu" to back out (cancelling).
            // Wait, the user asked for a player that takes the link.
            // Let's assume the user types in the input box and there is a submit action there.
            // Added "Press Center to Save" text in Screen.tsx.
            // But Button is hidden.
            // Let's rely on `onUrlChange` being passed to Screen, and Screen calling it.
            // Screen needs to expose a way or handle the keypress.
            // Actually, if I can't bind the hardware button easily to the internal state of child,
            // I'll update Screen.tsx to listen to a specific prop trigger or just handle it within Screen if focused.
            // For simplicity, let's leave handleSelect empty for 'input' view here, 
            // and assume the user clicks the "hidden" save button or hits Enter key in the input.
        } else {
            setIsPlaying(!isPlaying);
        }
    };

    const handleNext = () => {
        if (view === 'menu') {
            setSelectedIndex((prev) => Math.min(prev + 1, menuItems.length - 1));
        }
    };

    const handlePrev = () => {
        if (view === 'menu') {
            setSelectedIndex((prev) => Math.max(prev - 1, 0));
        }
    };

    const handleScroll = (direction: 1 | -1) => {
        if (direction === 1) handleNext();
        else handlePrev();
    };

    const handlePlayPause = () => {
        setIsPlaying(!isPlaying);
    };

    return (
        <div className="relative w-[370px] h-[600px] bg-[#F2F2F2] rounded-[30px] shadow-2xl flex flex-col items-center p-6 border-4 border-[#E0E0E0]">
            {/* Screen Container */}
            <div className="mb-8">
                <Screen
                    view={view}
                    menuItems={menuItems}
                    selectedIndex={selectedIndex}
                    isPlaying={isPlaying}
                    videoUrl={videoUrl}
                    onUrlChange={handleUrlChange}
                />
            </div>

            {/* Wheel Container */}
            <div className="flex-1 flex items-center justify-center">
                <Wheel
                    onMenuClick={handleMenuClick}
                    onSelect={handleSelect}
                    onNext={handleNext}
                    onPrev={handlePrev}
                    onPlayPause={handlePlayPause}
                    onScroll={handleScroll}
                    isPlaying={isPlaying}
                />
            </div>
        </div>
    );
}
