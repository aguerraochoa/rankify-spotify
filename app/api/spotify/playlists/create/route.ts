import { withSpotify, handleSpotifyResponse } from '@/lib/spotify/api-helper'

export async function POST(request: Request) {
    try {
        const { name, trackIds, description } = await request.json()

        if (!name || !trackIds || !Array.isArray(trackIds)) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const result = await withSpotify(async (spotify) => {
            return await spotify.createPlaylist(name, trackIds, description)
        })

        return handleSpotifyResponse(result)
    } catch (error) {
        console.error('Error in playlist creation route:', error)
        return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
}
