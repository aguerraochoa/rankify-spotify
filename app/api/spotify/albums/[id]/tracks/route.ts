import { createClient } from '@/lib/supabase/server'
import { SpotifyClient } from '@/lib/spotify/client'
import { NextResponse } from 'next/server'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
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
        const tracks = await spotify.getAlbumTracks(id)

        return NextResponse.json(tracks)
    } catch (error) {
        console.error('Error fetching album tracks:', error)
        return NextResponse.json({ error: 'Failed to fetch tracks' }, { status: 500 })
    }
}
