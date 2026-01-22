import { createClient } from '@/lib/supabase/server'
import { SpotifyClient } from '@/lib/spotify/client'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()

        // Get the current session which contains the Spotify access token
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const accessToken = session.provider_token
        if (!accessToken) {
            return NextResponse.json({ error: 'No Spotify access token' }, { status: 401 })
        }

        const spotify = new SpotifyClient(accessToken)
        const playlists = await spotify.getUserPlaylists()

        return NextResponse.json(playlists)
    } catch (error) {
        console.error('Error fetching playlists:', error)
        return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 })
    }
}
