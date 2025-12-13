
import React from 'react';
import { useUser, useClerk } from "@clerk/nextjs";
import { LogOut } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CustomUserMenu() {
    const { user } = useUser();
    const { signOut } = useClerk();

    if (!user) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400">
                    <img
                        src={user.imageUrl}
                        alt={user.fullName || "User"}
                        className="w-full h-full object-cover"
                    />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-64 p-0 ml-2 bg-white/95 backdrop-blur-sm border-white/20 shadow-xl rounded-xl"
                side="right"
                align="start"
                sideOffset={10}
            >
                {/* User Info Header */}
                <div className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 shrink-0">
                        <img
                            src={user.imageUrl}
                            alt={user.fullName || "User"}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                            {user.fullName}
                        </span>
                        <span className="text-xs text-gray-500 truncate">
                            {user.primaryEmailAddress?.emailAddress}
                        </span>
                    </div>
                </div>

                <DropdownMenuSeparator className="bg-gray-100 m-0" />

                {/* Actions */}
                <div className="p-1">
                    <DropdownMenuItem
                        onClick={() => signOut()}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 cursor-pointer rounded-lg hover:bg-gray-50 focus:bg-gray-50 outline-none transition-colors"
                    >
                        <LogOut size={16} className="text-gray-500" />
                        <span>Sign out</span>
                    </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator className="bg-gray-100 m-0" />

                {/* Footer */}
                <div className="p-3 text-center">
                    <div className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                        Secured by
                        <span className="font-semibold text-gray-500">clerk</span>
                    </div>
                </div>

            </DropdownMenuContent>
        </DropdownMenu>
    );
}
