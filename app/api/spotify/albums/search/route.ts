import { withSpotify, handleSpotifyResponse } from '@/lib/spotify/api-helper'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
        return Response.json({ error: 'Query parameter is required' }, { status: 400 })
    }

    const result = await withSpotify(async (spotify) => {
        return await spotify.searchAlbums(query)
    })

    return handleSpotifyResponse(result)
}
