"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { motion } from "motion/react";
import { History, Clock, Play } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

const drawerVariants = {
    hidden: {
        y: "100%",
        opacity: 0,
        rotateX: 5,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 30,
        },
    },
    visible: {
        y: 0,
        opacity: 1,
        rotateX: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 0.8,
            staggerChildren: 0.07,
            delayChildren: 0.2,
        },
    },
};

const itemVariants = {
    hidden: {
        y: 20,
        opacity: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 30,
        },
    },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 0.8,
        },
    },
};

export function HistoryDrawer() {
    const { history, playSongFromHistory } = usePlayer();

    // Reverse history to show latest first
    const reversedHistory = React.useMemo(() => [...history].reverse(), [history]);

    return (
        <Drawer>
            <DrawerTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 text-xs">
                    <History className="w-3 h-3" />
                    History
                </Button>
            </DrawerTrigger>
            <DrawerContent className="max-w-md mx-auto p-6 rounded-t-2xl shadow-xl bg-white dark:bg-zinc-900 max-h-[85vh]">
                <motion.div
                    variants={drawerVariants as any}
                    initial="hidden"
                    animate="visible"
                    className="mx-auto w-full space-y-6 h-full flex flex-col"
                >
                    <motion.div variants={itemVariants as any} className="flex-shrink-0">
                        <DrawerHeader className="px-0 space-y-2.5 text-left">
                            <DrawerTitle className="text-2xl font-semibold flex items-center gap-2.5 tracking-tighter">
                                <History className="w-6 h-6" />
                                History
                            </DrawerTitle>
                            <DrawerDescription className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 tracking-tighter">
                                Your recently played tracks.
                            </DrawerDescription>
                        </DrawerHeader>
                    </motion.div>

                    <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                        {reversedHistory.length === 0 ? (
                            <motion.div variants={itemVariants as any} className="text-center text-zinc-500 py-10">
                                No history yet.
                            </motion.div>
                        ) : (
                            reversedHistory.map((item, index) => (
                                <motion.div
                                    key={`${item.id}-${index}`}
                                    variants={itemVariants as any}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 transition-colors cursor-pointer group"
                                    onClick={() => {
                                        // We need to find the correct index in the original array
                                        // The original array is 'history'.
                                        // The item we clicked corresponds to history[history.length - 1 - index]
                                        playSongFromHistory(history.length - 1 - index);
                                    }}
                                >
                                    <div className="w-10 h-10 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                                        <img src={`https://img.youtube.com/vi/${item.id}/default.jpg`} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className="text-sm font-medium truncate text-zinc-900 dark:text-zinc-100">{item.title}</p>
                                        <p className="text-xs text-zinc-500 truncate">{item.channel || item.playlistTitle || 'Unknown Artist'}</p>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Play className="w-4 h-4 text-zinc-900" />
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>

                    <motion.div variants={itemVariants as any} className="flex-shrink-0">
                        <DrawerFooter className="flex flex-col gap-3 px-0">
                            <DrawerClose asChild>
                                <Button
                                    variant="outline"
                                    className="w-full h-11 rounded-xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-sm font-semibold transition-colors tracking-tighter"
                                >
                                    Close
                                </Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </motion.div>
                </motion.div>
            </DrawerContent>
        </Drawer>
    );
}
