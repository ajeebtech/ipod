const fs = require('fs');
const path = require('path');

function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (!fs.existsSync(envPath)) return {};
        const content = fs.readFileSync(envPath, 'utf8');
        const env = {};
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                env[key] = value;
            }
        });
        return env;
    } catch (e) {
        return {};
    }
}

async function testSearch(query) {
    const env = loadEnv();
    const apiKey = env.NEXT_PUBLIC_YOUTUBE_API_KEY;

    console.log("----------------------------------------");
    console.log("Testing YouTube API Search (No Deps)");
    console.log("API Key present:", !!apiKey);
    if (apiKey) console.log("API Key (masked):", apiKey.slice(0, 4) + "..." + apiKey.slice(-4));
    console.log("Query:", query);
    console.log("----------------------------------------");

    if (!apiKey) {
        console.error("ERROR: No API Key found in .env.local");
        return;
    }

    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(query)}&type=video&key=${apiKey}`;

        // Use native fetch (Node 18+)
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            console.error("API ERROR:", JSON.stringify(data, null, 2));
            return;
        }

        console.log("Success! Items found:", data?.items?.length || 0);
        if (data.items && data.items.length > 0) {
            console.log("First Result:", data.items[0].snippet.title);
        } else {
            console.log("Raw Response:", JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error("NETWORK ERROR:", error);
    }
}

testSearch("lofi hip hop");
