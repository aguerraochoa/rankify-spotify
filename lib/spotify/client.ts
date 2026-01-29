import {
    SpotifyPlaylist,
    SpotifyTrack,
    SpotifyAlbum,
    SpotifyPaging,
    SpotifyPlaylistTrack,
    SearchResult
} from './types';

const SPOTIFY_BASE_URL = 'https://api.spotify.com/v1';

export class SpotifyClient {
    private accessToken: string;

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    /**
     * Update the access token
     */
    setAccessToken(token: string) {
        this.accessToken = token;
    }


    private async fetchSpotify<T>(endpoint: string): Promise<T> {
        const url = endpoint.startsWith('http') ? endpoint : `${SPOTIFY_BASE_URL}${endpoint}`;
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
            },
        });

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('Spotify rate limit exceeded');
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Spotify API error: ${response.status} ${errorData.error?.message || response.statusText}`);
        }

        return response.json();
    }

    private async fetchAllPages<T>(initialEndpoint: string): Promise<T[]> {
        let allItems: T[] = [];
        let url: string | null = initialEndpoint;

        while (url) {
            const data: SpotifyPaging<T> = await this.fetchSpotify<SpotifyPaging<T>>(url);
            allItems = allItems.concat(data.items);
            url = data.next;
        }

        return allItems;
    }

    /**
     * Get current user's playlists (fetches all available pages)
     */
    async getUserPlaylists(): Promise<SpotifyPlaylist[]> {
        return this.fetchAllPages<SpotifyPlaylist>('/me/playlists?limit=50');
    }

    /**
     * Get tracks from a playlist
     */
    async getPlaylistTracks(playlistId: string): Promise<SearchResult[]> {
        const data = await this.fetchSpotify<SpotifyPaging<SpotifyPlaylistTrack>>(`/playlists/${playlistId}/tracks?limit=100`);

        return data.items
            .filter(item => item.track !== null)
            .map((item, index) => ({
                id: `${item.track.id}-${index}`,
                title: item.track.name,
                artist: item.track.artists.map(a => a.name).join(', '),
                type: 'recording',
                coverArtUrl: item.track.album.images[0]?.url,
                albumTitle: item.track.album.name,
                albumId: item.track.album.id,
                previewUrl: item.track.preview_url,
                spotifyUri: `spotify:track:${item.track.id}`,
            }));
    }

    /**
     * Search for albums
     */
    async searchAlbums(query: string, limit = 20): Promise<SearchResult[]> {
        const encodedQuery = encodeURIComponent(query);
        const data = await this.fetchSpotify<{ albums: SpotifyPaging<SpotifyAlbum> }>(
            `/search?q=${encodedQuery}&type=album&limit=${limit}`
        );

        return data.albums.items.map(album => ({
            id: album.id,
            title: album.name,
            artist: album.artists.map(a => a.name).join(', '),
            type: 'release-group',
            coverArtUrl: album.images[0]?.url,
        }));
    }

    /**
     * Get album tracks
     */
    async getAlbumTracks(albumId: string): Promise<SearchResult[]> {
        // Get album details for cover art
        const album = await this.fetchSpotify<SpotifyAlbum>(`/albums/${albumId}`);
        // Get full track objects (not simplified) to get preview URLs
        const trackIds = await this.fetchSpotify<SpotifyPaging<{ id: string }>>(`/albums/${albumId}/tracks?limit=50`);

        if (trackIds.items.length === 0) return [];

        // Fetch full track details in batches of 50 (Spotify may return null for unavailable tracks)
        const ids = trackIds.items.map(t => t.id).join(',');
        const fullTracks = await this.fetchSpotify<{ tracks: (SpotifyTrack | null)[] }>(`/tracks?ids=${ids}`);

        const validTracks = fullTracks.tracks.filter((t): t is SpotifyTrack => t != null);
        return validTracks.map((track, index) => ({
            id: `${track.id}-${index}`,
            title: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            type: 'recording',
            coverArtUrl: album.images[0]?.url,
            albumTitle: album.name,
            albumId: album.id,
            previewUrl: track.preview_url,
            spotifyUri: `spotify:track:${track.id}`,
        }));
    }

    /**
     * Get user's saved albums
     */
    async getUserSavedAlbums(limit = 50): Promise<SearchResult[]> {
        const data = await this.fetchSpotify<SpotifyPaging<{ album: SpotifyAlbum }>>(
            `/me/albums?limit=${limit}`
        );

        return data.items.map(item => ({
            id: item.album.id,
            title: item.album.name,
            artist: item.album.artists.map(a => a.name).join(', '),
            type: 'release-group',
            coverArtUrl: item.album.images[0]?.url,
        }));
    }

    /**
     * Get current user's Spotify ID
     */
    async getCurrentUserId(): Promise<string> {
        const profile = await this.fetchSpotify<{ id: string }>('/me');
        return profile.id;
    }

    /**
     * Create a new playlist and add tracks
     */
    async createPlaylist(
        name: string,
        uris: string[],
        description: string = 'Created with Rankify'
    ): Promise<{ playlistId: string; playlistUrl: string }> {
        // Get user ID
        const userId = await this.getCurrentUserId();

        // Create playlist
        const playlist = await fetch(`${SPOTIFY_BASE_URL}/users/${userId}/playlists`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                description,
                public: false, // Private by default
            }),
        }).then(res => res.json());

        if (!playlist.id) {
            throw new Error('Failed to create playlist');
        }

        // Add tracks (Spotify accepts up to 100 URIs per request)
        // uris are already passed in correctly

        // Add tracks in batches of 100
        for (let i = 0; i < uris.length; i += 100) {
            const batch = uris.slice(i, i + 100);
            await fetch(`${SPOTIFY_BASE_URL}/playlists/${playlist.id}/tracks`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ uris: batch }),
            });
        }

        return {
            playlistId: playlist.id,
            playlistUrl: playlist.external_urls?.spotify || `https://open.spotify.com/playlist/${playlist.id}`,
        };
    }
}
