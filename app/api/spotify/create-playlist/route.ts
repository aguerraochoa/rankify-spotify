
import { NextRequest, NextResponse } from 'next/server'
import { withSpotify, handleSpotifyResponse } from '@/lib/spotify/api-helper'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { name, uris, description } = body

        if (!name || !uris || !Array.isArray(uris)) {
            return NextResponse.json(
                { error: 'Missing name or uris' },
                { status: 400 }
            )
        }

        const result = await withSpotify(async (spotify) => {
            const playlist = await spotify.createPlaylist(name, uris, description)
            return playlist
        })

        return handleSpotifyResponse(result)
    } catch (error) {
        console.error('Error in create-playlist route:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
