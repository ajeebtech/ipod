
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Check User Agent
    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    const { pathname } = request.nextUrl;

    // Redirect to /mobile if on mobile device and accessing root
    if (isMobile && pathname === '/') {
        return NextResponse.redirect(new URL('/mobile', request.url));
    }

    // Redirect to / (desktop) if on desktop device and accessing /mobile ? 
    // Maybe optional, but good for consistency. 
    // User didn't ask for this explicitly, but it makes sense.
    // Although simulated mobile views on desktop would break.
    // Let's stick to ONLY mobile -> /mobile rule for now to be safe.

    return NextResponse.next();
}

export const config = {
    matcher: ['/', '/mobile'],
};
