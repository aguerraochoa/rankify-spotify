import { createClient } from '@/lib/supabase/server'
import { SpotifyClient } from '@/lib/spotify/client'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const query = searchParams.get('q')

        if (!query) {
            return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
        }

        const supabase = await createClient()

        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const accessToken = session.provider_token
        if (!accessToken) {
            return NextResponse.json({ error: 'No Spotify access token' }, { status: 401 })
        }

        const spotify = new SpotifyClient(accessToken)
        const albums = await spotify.searchAlbums(query)

        return NextResponse.json(albums)
    } catch (error) {
        console.error('Error searching albums:', error)
        return NextResponse.json({ error: 'Failed to search albums' }, { status: 500 })
    }
}
