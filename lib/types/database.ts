export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      songs: {
        Row: {
          id: string
          user_id: string
          musicbrainz_id: string | null
          title: string
          artist: string
          album_title: string | null
          album_musicbrainz_id: string | null
          cover_art_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          musicbrainz_id?: string | null
          title: string
          artist: string
          album_title?: string | null
          album_musicbrainz_id?: string | null
          cover_art_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          musicbrainz_id?: string | null
          title?: string
          artist?: string
          album_title?: string | null
          album_musicbrainz_id?: string | null
          cover_art_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      song_rankings: {
        Row: {
          id: string
          user_id: string
          song_id: string
          rank: number
          comparison_session_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          song_id: string
          rank: number
          comparison_session_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          song_id?: string
          rank?: number
          comparison_session_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      song_comparisons: {
        Row: {
          id: string
          user_id: string
          song_a_id: string
          song_b_id: string
          preferred_song_id: string | null
          result: 'preferred_a' | 'preferred_b' | 'tie' | 'skip' | 'havent_heard'
          comparison_session_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          song_a_id: string
          song_b_id: string
          preferred_song_id?: string | null
          result: 'preferred_a' | 'preferred_b' | 'tie' | 'skip' | 'havent_heard'
          comparison_session_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          song_a_id?: string
          song_b_id?: string
          preferred_song_id?: string | null
          result?: 'preferred_a' | 'preferred_b' | 'tie' | 'skip' | 'havent_heard'
          comparison_session_id?: string | null
          created_at?: string
        }
      }
      albums: {
        Row: {
          id: string
          user_id: string
          musicbrainz_id: string
          title: string
          artist: string
          cover_art_url: string | null
          mu: number
          sigma: number
          initial_vibe: 'loved' | 'mid' | 'didnt_like' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          musicbrainz_id: string
          title: string
          artist: string
          cover_art_url?: string | null
          mu?: number
          sigma?: number
          initial_vibe?: 'loved' | 'mid' | 'didnt_like' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          musicbrainz_id?: string
          title?: string
          artist?: string
          cover_art_url?: string | null
          mu?: number
          sigma?: number
          initial_vibe?: 'loved' | 'mid' | 'didnt_like' | null
          created_at?: string
          updated_at?: string
        }
      }
      album_comparisons: {
        Row: {
          id: string
          user_id: string
          album_a_id: string
          album_b_id: string
          preferred_album_id: string | null
          result: 'preferred_a' | 'preferred_b' | 'tie'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          album_a_id: string
          album_b_id: string
          preferred_album_id?: string | null
          result: 'preferred_a' | 'preferred_b' | 'tie'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          album_a_id?: string
          album_b_id?: string
          preferred_album_id?: string | null
          result?: 'preferred_a' | 'preferred_b' | 'tie'
          created_at?: string
        }
      }
    }
  }
}

