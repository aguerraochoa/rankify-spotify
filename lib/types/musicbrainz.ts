// MusicBrainz API Types

export interface MusicBrainzRecording {
  id: string
  title: string
  'artist-credit': Array<{
    artist: {
      id: string
      name: string
    }
  }>
  releases?: Array<{
    id: string
    title: string
    'release-group': {
      id: string
      title: string
    }
    date?: string
  }>
}

export interface MusicBrainzReleaseGroup {
  id: string
  title: string
  'artist-credit': Array<{
    artist: {
      id: string
      name: string
    }
  }>
  'first-release-date'?: string
  'primary-type'?: string
  'secondary-types'?: string[]
}

export interface MusicBrainzRelease {
  id: string
  title: string
  date?: string
  status?: string // e.g., "Official", "Promotion", "Bootleg"
  'release-group'?: {
    id: string
    title: string
    'primary-type'?: string // e.g., "Album", "Single", "EP"
  }
  'artist-credit'?: Array<{
    artist: {
      id: string
      name: string
    }
  }>
  media?: Array<{
    position: number
    track?: Array<{
      position: number
      number: string
      recording: {
        id: string
        title: string
        'artist-credit': Array<{
          artist: {
            id: string
            name: string
          }
        }>
        length?: number
      }
    }>
  }>
}

export interface CoverArtArchiveResponse {
  images: Array<{
    front: boolean
    back: boolean
    image: string
    thumbnails: {
      small: string
      large: string
    }
  }>
}

export interface SearchResult {
  id: string
  title: string
  artist: string
  type: 'recording' | 'release-group'
  coverArtUrl?: string
  albumTitle?: string // For recordings
  albumId?: string // For recordings (release-group ID)
}

