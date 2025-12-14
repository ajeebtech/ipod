export interface YouTubeVideo {
    id: string;
    title: string;
    channel: string;
    thumbnail: string;
}

import { decodeHtml } from './utils';

export async function searchYouTube(query: string): Promise<{ items: YouTubeVideo[], error?: string }> {
    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

    // 1. Check if input is a valid YouTube URL (Video or Playlist specific video)
    const urlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (urlPattern.test(query)) {
        try {
            // Use oEmbed for direct URLs (No API Key needed, No Quota used)
            const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(query)}&format=json`;
            const response = await fetch(oembedUrl);

            if (!response.ok) {
                if (response.status === 404) return { items: [], error: "Video not found or is private" };
                return { items: [], error: "Failed to load video info" };
            }

            const data = await response.json();

            // Extract ID from URL for the returned item
            let videoId = "";
            const urlObj = new URL(query.startsWith('http') ? query : `https://${query}`);
            if (urlObj.hostname === 'youtu.be') {
                videoId = urlObj.pathname.slice(1);
            } else {
                videoId = urlObj.searchParams.get('v') || "";
            }

            if (!videoId) return { items: [], error: "Invalid YouTube URL" };

            return {
                items: [{
                    id: videoId,
                    title: data.title,
                    channel: data.author_name,
                    thumbnail: data.thumbnail_url
                }]
            };

        } catch (e) {
            console.error("oEmbed error:", e);
            // Fallback to search if oEmbed fails (unlikely for valid public videos)
        }
    }

    // 2. Fallback to API Search for non-URLs or failed oEmbed
    if (!apiKey) {
        console.error("YouTube API Key is missing");
        return { items: [], error: "Missing API Key" };
    }

    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(query)}&type=video&regionCode=US&key=${apiKey}`
        );

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error("YouTube API Error:", response.statusText, err);

            // Handle Quota Error specifically
            if (err?.error?.code === 403 && err?.error?.message?.includes('quota')) {
                return { items: [], error: "Daily YouTube search limit reached. Please paste a direct video link instead." };
            }

            return { items: [], error: `YouTube Error: ${err?.error?.message || response.statusText}` };
        }

        const data = await response.json();

        if (!data.items) return { items: [] };

        const items = data.items.map((item: any) => ({
            id: item.id.videoId,
            title: decodeHtml(item.snippet.title),
            channel: decodeHtml(item.snippet.channelTitle),
            thumbnail: item.snippet.thumbnails.default.url
        }));

        return { items };
    } catch (error) {
        console.error("Failed to fetch YouTube results", error);
        return { items: [], error: "Network failed" };
    }
}
