import { withSpotify, handleSpotifyResponse } from '@/lib/spotify/api-helper'

export async function GET() {
    const result = await withSpotify(async (spotify) => {
        return await spotify.getUserPlaylists()
    })

    return handleSpotifyResponse(result)
}
