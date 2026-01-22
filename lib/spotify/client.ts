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

    /**
     * Get current user's playlists
     */
    async getUserPlaylists(limit = 50, offset = 0): Promise<SpotifyPaging<SpotifyPlaylist>> {
        return this.fetchSpotify<SpotifyPaging<SpotifyPlaylist>>(`/me/playlists?limit=${limit}&offset=${offset}`);
    }

    /**
     * Get tracks from a playlist
     */
    async getPlaylistTracks(playlistId: string): Promise<SearchResult[]> {
        const data = await this.fetchSpotify<SpotifyPaging<SpotifyPlaylistTrack>>(`/playlists/${playlistId}/tracks?limit=100`);

        return data.items
            .filter(item => item.track !== null)
            .map(item => ({
                id: item.track.id,
                title: item.track.name,
                artist: item.track.artists.map(a => a.name).join(', '),
                type: 'recording',
                coverArtUrl: item.track.album.images[0]?.url,
                albumTitle: item.track.album.name,
                albumId: item.track.album.id,
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
        // We need the album details first to get the cover art
        const album = await this.fetchSpotify<SpotifyAlbum>(`/albums/${albumId}`);
        const data = await this.fetchSpotify<SpotifyPaging<SpotifyTrack>>(`/albums/${albumId}/tracks?limit=50`);

        return data.items.map(track => ({
            id: track.id,
            title: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            type: 'recording',
            coverArtUrl: album.images[0]?.url,
            albumTitle: album.name,
            albumId: album.id,
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
}
