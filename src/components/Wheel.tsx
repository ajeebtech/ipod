import React, { useRef, useState, useEffect } from 'react';
import { FastForward, Rewind, Play, Pause } from 'lucide-react';
// Assuming cn utility will be created or standard clsx usage

interface WheelProps {
    onMenuClick?: () => void;
    onSelect?: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    onPlayPause?: () => void;
    onScroll?: (direction: 1 | -1) => void;
    isPlaying?: boolean;
}

export function Wheel({ onMenuClick, onSelect, onNext, onPrev, onPlayPause, onScroll, isPlaying }: WheelProps) {
    const wheelRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [lastAngle, setLastAngle] = useState<number | null>(null);

    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging || !wheelRef.current || !onScroll) return;

            const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

            const rect = wheelRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const x = clientX - centerX;
            const y = clientY - centerY;

            // Calculate angle in degrees (0-360)
            let angle = Math.atan2(y, x) * (180 / Math.PI);
            if (angle < 0) angle += 360;

            if (lastAngle !== null) {
                let delta = angle - lastAngle;

                // Handle wrapping around 0/360
                if (delta > 180) delta -= 360;
                if (delta < -180) delta += 360;

                // Sensitivity threshold (e.g., 15 degrees per tick)
                if (Math.abs(delta) > 15) {
                    onScroll(delta > 0 ? 1 : -1);
                    setLastAngle(angle);
                }
            } else {
                setLastAngle(angle);
            }
        };

        const handleUp = () => {
            setIsDragging(false);
            setLastAngle(null);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('touchmove', handleMove); // Add touch support
            window.addEventListener('mouseup', handleUp);
            window.addEventListener('touchend', handleUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchend', handleUp);
        };
    }, [isDragging, lastAngle, onScroll]);

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        // Prevent default to avoid scrolling the page while using the wheel
        // but allow clicking buttons. 
        // Actually, we can just let it propagate if it's on a button, but for the wheel bg:
        setIsDragging(true);
    };

    return (
        <div
            className="relative w-64 h-64 bg-[#F2F2F2] rounded-full flex items-center justify-center shadow-md touch-none"
            ref={wheelRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
        >
            {/* Menu Button (Top) */}
            <button
                onClick={(e) => { e.stopPropagation(); onMenuClick?.(); }}
                className="absolute top-4 text-gray-500 hover:text-gray-800 font-bold text-xs tracking-widest uppercase focus:outline-none z-10"
            >
                Menu
            </button>

            {/* Next Button (Right) */}
            <button
                onClick={(e) => { e.stopPropagation(); onNext?.(); }}
                className="absolute right-4 text-gray-400 hover:text-gray-600 focus:outline-none z-10"
            >
                <FastForward size={20} fill="currentColor" />
            </button>

            {/* Prev Button (Left) */}
            <button
                onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
                className="absolute left-4 text-gray-400 hover:text-gray-600 focus:outline-none z-10"
            >
                <Rewind size={20} fill="currentColor" />
            </button>

            {/* Play/Pause Button (Bottom) */}
            <button
                onClick={(e) => { e.stopPropagation(); onPlayPause?.(); }}
                className="absolute bottom-4 text-gray-400 hover:text-gray-600 flex items-center gap-1 focus:outline-none z-10"
            >
                <Play size={12} fill="currentColor" />
                <Pause size={12} fill="currentColor" />
            </button>

            {/* Center Button (Select) - Independent of wheel dragging */}
            <button
                onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
                className="w-24 h-24 bg-gradient-to-b from-[#E3E3E3] to-[#C9C9C9] rounded-full shadow-inner active:scale-95 transition-transform z-20"
            />
        </div>
    );
}
