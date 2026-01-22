export interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  href: string;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: 'album' | 'single' | 'compilation';
  artists: SpotifyArtist[];
  images: SpotifyImage[];
  release_date: string;
  total_tracks: number;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  track_number: number;
  preview_url: string | null;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: SpotifyImage[];
  owner: {
    display_name: string;
    id: string;
  };
  tracks: {
    total: number;
    href: string;
  };
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyUserProfile {
  id: string;
  display_name: string;
  email: string;
  images: SpotifyImage[];
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyPaging<T> {
  href: string;
  items: T[];
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
}

export interface SpotifyPlaylistTrack {
  added_at: string;
  track: SpotifyTrack;
}

export interface SearchResult {
  id: string;
  title: string;
  artist: string;
  type: 'recording' | 'release-group' | 'playlist';
  coverArtUrl?: string;
  albumTitle?: string;
  albumId?: string;
}
