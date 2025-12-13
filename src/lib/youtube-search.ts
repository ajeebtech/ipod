export interface YouTubeVideo {
    id: string;
    title: string;
    channel: string;
    thumbnail: string;
}

export async function searchYouTube(query: string): Promise<{ items: YouTubeVideo[], error?: string }> {
    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

    if (!apiKey) {
        console.error("YouTube API Key is missing");
        return { items: [], error: "Missing API Key in .env.local" };
    }

    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(query)}&type=video&regionCode=US&key=${apiKey}`
        );

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error("YouTube API Error:", response.statusText, err);
            return { items: [], error: `YouTube API Error: ${err?.error?.message || response.statusText}` };
        }

        const data = await response.json();

        if (!data.items) return { items: [] };

        const items = data.items.map((item: any) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.default.url
        }));

        return { items };
    } catch (error) {
        console.error("Failed to fetch YouTube results", error);
        return { items: [], error: "Network failed" };
    }
}
