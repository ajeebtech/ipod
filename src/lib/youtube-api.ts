export async function fetchPlaylistItems(playlistId: string) {
    const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    if (!API_KEY) {
        console.warn("NEXT_PUBLIC_YOUTUBE_API_KEY is missing. Cannot fetch playlist details.");
        return { title: 'Unknown Playlist', items: [] };
    }

    try {
        // Fetch playlist details (for title)
        const playlistResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${API_KEY}`
        );
        const playlistData = await playlistResponse.json();
        const playlistTitle = playlistData.items?.[0]?.snippet?.title || 'Unknown Playlist';

        // Fetch items
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${API_KEY}`
        );

        if (!response.ok) {
            console.error("Failed to fetch playlist items:", await response.text());
            return { title: playlistTitle, items: [] };
        }

        const data = await response.json();
        const items = data.items.map((item: any) => ({
            id: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            // Append list ID to URL for persistence
            url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}&list=${playlistId}`,
            thumbnail: item.snippet.thumbnails?.default?.url
        })).filter((item: any) => item.title !== "Private video" && item.title !== "Deleted video");

        return { title: playlistTitle, items };

    } catch (error) {
        console.error("Error fetching playlist:", error);
        return { title: 'Unknown Playlist', items: [] };
    }
}
