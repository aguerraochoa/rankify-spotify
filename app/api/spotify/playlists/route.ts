import { withSpotify, handleSpotifyResponse } from '@/lib/spotify/api-helper'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const result = await withSpotify(request, async (spotify) => {
        const playlists = await spotify.getUserPlaylists();
        return { items: playlists };
    })

    return handleSpotifyResponse(result)
}
