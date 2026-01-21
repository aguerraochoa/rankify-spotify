import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRankedListForTemplate } from '@/lib/db/rankedLists'

// Mark this route as dynamic since it uses cookies for authentication
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const listId = params.id
    const userId = user?.id

    // Get ranking (can be public or owned by user)
    const ranking = await getRankedListForTemplate(listId, userId)

    if (!ranking) {
      return NextResponse.json(
        { error: 'Ranking not found or not accessible' },
        { status: 404 }
      )
    }

    // Format songs for template use
    // Group songs by album to reconstruct album structure
    const albumsMap = new Map<string, {
      id: string | null
      title: string | null
      artist: string
      coverArtUrl: string | null
    }>()

    const templateSongs = ranking.songs.map((song) => {
      // Use album_musicbrainz_id if available, otherwise use title+artist as key
      const albumId = song.album_musicbrainz_id || null
      const albumKey = albumId || (song.album_title 
        ? `${song.album_title}|${song.artist}`
        : song.artist)

      // Extract album info from first song of each album
      if (!albumsMap.has(albumKey)) {
        albumsMap.set(albumKey, {
          id: albumId, // Use stored album_musicbrainz_id
          title: song.album_title || null,
          artist: song.artist,
          coverArtUrl: song.cover_art_url || null,
        })
      }

      return {
        musicbrainz_id: song.musicbrainz_id,
        title: song.title,
        artist: song.artist,
        album_title: song.album_title || null,
        album_musicbrainz_id: albumId, // Use stored album_musicbrainz_id
        cover_art_url: song.cover_art_url || null,
      }
    })

    const albums = Array.from(albumsMap.values())

    return NextResponse.json({
      ranking: {
        id: ranking.id,
        name: ranking.name,
        created_at: ranking.created_at,
      },
      albums,
      songs: templateSongs,
    })
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

