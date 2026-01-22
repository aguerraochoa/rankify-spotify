/**
 * Spotify Authentication Utilities
 */

interface SpotifyRefreshResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
}

/**
 * Refreshes the Spotify access token using the provided refresh token.
 */
export async function refreshSpotifyToken(refreshToken: string): Promise<string> {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Missing Spotify Client ID or Client Secret');
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to refresh Spotify token: ${response.status} ${errorData.error_description || response.statusText}`);
    }

    const data: SpotifyRefreshResponse = await response.json();
    return data.access_token;
}
