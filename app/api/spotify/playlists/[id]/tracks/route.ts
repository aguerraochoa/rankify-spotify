import { withSpotify, handleSpotifyResponse } from '@/lib/spotify/api-helper'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const result = await withSpotify(request, async (spotify) => {
        return await spotify.getPlaylistTracks(id)
    })

    return handleSpotifyResponse(result)
}
