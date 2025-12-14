import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware(async (auth, req) => {
    if (req.nextUrl.hostname === "ipod-five.vercel.app") {
        const url = new URL(req.nextUrl.toString());
        url.hostname = "ipod3d.site";
        return NextResponse.redirect(url);
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
