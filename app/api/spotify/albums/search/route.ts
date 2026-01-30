import { withSpotify, handleSpotifyResponse } from '@/lib/spotify/api-helper'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
        return Response.json({ error: 'Query parameter is required' }, { status: 400 })
    }

    const result = await withSpotify(request, async (spotify) => {
        return await spotify.searchAlbums(query)
    })

    return handleSpotifyResponse(result)
}
