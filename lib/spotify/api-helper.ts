import { createClient } from '@/lib/supabase/server'
import { SpotifyClient } from '@/lib/spotify/client'
import { refreshSpotifyToken } from '@/lib/spotify/auth'
import { NextResponse } from 'next/server'

/**
 * Helper to run a Spotify operation with automatic token refresh
 */
export async function withSpotify<T>(
    operation: (client: SpotifyClient) => Promise<T>
) {
    try {
        const supabase = await createClient()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
            return { error: 'Not authenticated', status: 401 }
        }

        const accessToken = session.provider_token
        const refreshToken = session.provider_refresh_token

        console.log('Spotify API Call Attempt:', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken
        })

        if (!accessToken) {
            console.error('No Spotify access token found in session')
            return { error: 'No Spotify access token', status: 401 }
        }

        const spotify = new SpotifyClient(accessToken)

        try {
            const data = await operation(spotify)
            return { data }
        } catch (error: any) {
            console.error('Spotify operation failed:', error.message)

            // If it's a 401, try to refresh
            if (error.message.includes('401') && refreshToken) {
                try {
                    console.log('Spotify token expired (401), attempting refresh with Spotify...')
                    const newAccessToken = await refreshSpotifyToken(refreshToken)
                    console.log('Successfully refreshed Spotify token')

                    spotify.setAccessToken(newAccessToken)

                    const data = await operation(spotify)
                    return { data }
                } catch (refreshError: any) {
                    console.error('Failed to refresh Spotify token:', refreshError.message)
                    return { error: 'Session expired. Please log in again.', status: 401 }
                }
            } else if (error.message.includes('401')) {
                console.error('Spotify 401 received but no refresh token available')
                return { error: 'Session expired. Please log in again.', status: 401 }
            }
            throw error
        }
    } catch (error: any) {
        console.error('Spotify API Helper Error:', error)
        return { error: error.message || 'Spotify operation failed', status: 500 }
    }
}

/**
 * Helper to handle standard Spotify API route responses
 */
export function handleSpotifyResponse(result: { data?: any, error?: string, status?: number }) {
    if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status || 500 })
    }
    return NextResponse.json(result.data)
}
