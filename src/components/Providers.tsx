"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { PlayerProvider } from "@/context/PlayerContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ClerkProvider>
            <PlayerProvider>
                {children}
            </PlayerProvider>
        </ClerkProvider>
    );
}
