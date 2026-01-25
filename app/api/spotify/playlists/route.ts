import { withSpotify, handleSpotifyResponse } from '@/lib/spotify/api-helper'

export const dynamic = 'force-dynamic'

export async function GET() {
    const result = await withSpotify(async (spotify) => {
        const playlists = await spotify.getUserPlaylists();
        return { items: playlists };
    })

    return handleSpotifyResponse(result)
}
