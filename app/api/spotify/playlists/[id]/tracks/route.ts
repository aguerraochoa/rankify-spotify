import { withSpotify, handleSpotifyResponse } from '@/lib/spotify/api-helper'

export const dynamic = 'force-dynamic'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const result = await withSpotify(async (spotify) => {
        return await spotify.getPlaylistTracks(id)
    })

    return handleSpotifyResponse(result)
}
