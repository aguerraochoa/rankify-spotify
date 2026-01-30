import { createClient } from '@/lib/supabase/server'
import { SpotifyClient } from '@/lib/spotify/client'
import { refreshSpotifyToken } from '@/lib/spotify/auth'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/** Cookie set by auth callback when Supabase session has provider tokens (Supabase strips them on refresh). */
const SPOTIFY_TOKENS_COOKIE = 'sb-spotify-tokens'

function parseTokensPayload(raw: string | undefined): { provider_token: string | null; provider_refresh_token: string | null } | null {
    if (!raw) return null
    try {
        const parsed = JSON.parse(raw) as { provider_token?: string | null; provider_refresh_token?: string | null }
        return {
            provider_token: parsed.provider_token ?? null,
            provider_refresh_token: parsed.provider_refresh_token ?? null,
        }
    } catch {
        return null
    }
}

function getProviderTokensFromRequest(request: NextRequest | null): { provider_token: string | null; provider_refresh_token: string | null } | null {
    if (!request) return null
    return parseTokensPayload(request.cookies.get(SPOTIFY_TOKENS_COOKIE)?.value)
}

/**
 * Helper to run a Spotify operation with automatic token refresh.
 * Pass request so we can fall back to sb-spotify-tokens cookie when session lost provider tokens (e.g. after refresh).
 */
export async function withSpotify<T>(
    requestOrOperation: NextRequest | ((client: SpotifyClient) => Promise<T>),
    operationOrUndefined?: (client: SpotifyClient) => Promise<T>
): Promise<{ data?: T; error?: string; status?: number }> {
    const request = operationOrUndefined ? (requestOrOperation as NextRequest) : null
    const operation = operationOrUndefined ?? (requestOrOperation as (client: SpotifyClient) => Promise<T>)

    try {
        const supabase = await createClient()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
            return { error: 'Not authenticated', status: 401 }
        }

        let accessToken = session.provider_token ?? null
        let refreshToken = session.provider_refresh_token ?? null

        // Supabase strips provider_token/provider_refresh_token from session on JWT refresh. Use cookie set at OAuth.
        if (!accessToken || !refreshToken) {
            const fromRequest = getProviderTokensFromRequest(request)
            if (fromRequest?.provider_token || fromRequest?.provider_refresh_token) {
                accessToken = accessToken ?? fromRequest.provider_token
                refreshToken = refreshToken ?? fromRequest.provider_refresh_token
            }
            // Fallback: read from next/headers cookie store (same request in Route Handlers; handles edge cases)
            if ((!accessToken || !refreshToken)) {
                const cookieStore = await cookies()
                const fromStore = parseTokensPayload(cookieStore.get(SPOTIFY_TOKENS_COOKIE)?.value)
                if (fromStore?.provider_token || fromStore?.provider_refresh_token) {
                    accessToken = accessToken ?? fromStore.provider_token
                    refreshToken = refreshToken ?? fromStore.provider_refresh_token
                }
            }
        }

        // If access token is missing but we have a refresh token, try to refresh first
        if (!accessToken && refreshToken) {
            try {
                console.log('No access token, attempting proactive refresh...')
                accessToken = await refreshSpotifyToken(refreshToken)
                console.log('Successfully refreshed Spotify token proactively')
            } catch (refreshError: any) {
                console.error('Proactive token refresh failed:', refreshError.message)
                return { error: 'Session expired. Please log in again.', status: 401 }
            }
        }

        // If still no access token (and no refresh token), fail
        if (!accessToken) {
            console.error('No Spotify access token and no refresh token available')
            return { error: 'Session expired. Please log in again.', status: 401 }
        }

        const spotify = new SpotifyClient(accessToken)

        try {
            const data = await operation(spotify)
            return { data }
        } catch (error: any) {
            console.error('Spotify operation failed:', error.message)

            // If it's a 401, try to refresh (token may have expired during request)
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
