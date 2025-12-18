'use client';

import { useState, useEffect } from 'react';
import { X, Smartphone } from 'lucide-react';

export default function MobileWarning() {
    const [showWarning, setShowWarning] = useState(false);

    useEffect(() => {
        // Function to check screen size
        const checkMobile = () => {
            // Check if we are on the dedicated mobile route
            if (window.location.pathname === '/mobile') {
                return;
            }

            // Check if screen width is less than 768px (typical tablet/mobile breakpoint)
            if (window.innerWidth < 768) {
                // Check if user has already dismissed the warning in this session
                const hasDismissed = sessionStorage.getItem('mobile-warning-dismissed');
                if (!hasDismissed) {
                    setShowWarning(true);
                }
            }
        };

        // Check on mount
        checkMobile();

        // Optional: Re-check on resize if you want it to appear if they shrink the window
        // const handleResize = () => {
        //   if (window.innerWidth >= 768) {
        //     setShowWarning(false);
        //   } else {
        //      // logic to show again? usually intrusive if resizing.
        //      // Let's stick to initial load or if they resize to mobile and haven't dismissed.
        //      checkMobile();
        //   }
        // };
        // window.addEventListener('resize', handleResize);
        // return () => window.removeEventListener('resize', handleResize);

    }, []);

    if (!showWarning) return null;

    const handleDismiss = () => {
        setShowWarning(false);
        sessionStorage.setItem('mobile-warning-dismissed', 'true');
    };

    return (
        <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="p-3 bg-blue-50 rounded-full">
                        <Smartphone size={32} className="text-blue-500" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-lg font-bold text-gray-900">Desktop Recommended</h3>
                        <p className="text-sm text-gray-600 leading-relaxed text-balance">
                            This interactive 3D iPod experience works best on a desktop computer. Mobile controls and visuals may be limited.
                        </p>
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm active:scale-95 text-sm"
                    >
                        Continue Anyway
                    </button>
                </div>
            </div>
        </div>
    );
}
