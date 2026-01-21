import { createClient } from '@/lib/supabase/server'
import type { Song, RankingState } from '@/lib/ranking/binaryInsertion'

export interface RankedListSong {
  song_id?: string // If song exists in DB
  musicbrainz_id: string
  title: string
  artist: string
  cover_art_url?: string
  album_title?: string
  album_musicbrainz_id?: string // MusicBrainz release-group ID
  rank: number
}

export interface RankedList {
  id: string
  user_id: string
  name: string | null
  songs: RankedListSong[]
  song_count: number
  is_public: boolean
  share_token: string | null
  status?: 'draft' | 'completed'
  ranking_state?: any // Full ranking state for drafts (RankingState + songs metadata)
  created_at: string
  updated_at: string
}

/**
 * Save a completed ranked list
 */
export async function saveRankedList(
  userId: string,
  rankedSongs: Song[],
  name?: string,
  status: 'draft' | 'completed' = 'completed',
  rankingState?: any
): Promise<RankedList> {
  const supabase = await createClient()

  const songsData = rankedSongs.map((song, index) => ({
    musicbrainz_id: song.musicbrainzId || song.id,
    title: song.title,
    artist: song.artist,
    cover_art_url: song.coverArtUrl,
    album_title: song.albumTitle,
    album_musicbrainz_id: (song as any).albumId || (song as any).album_musicbrainz_id || null, // Preserve album ID from SongReview
    rank: index + 1,
  }))

  const { data, error } = await supabase
    .from('ranked_lists')
    .insert({
      user_id: userId,
      name: name || null,
      songs: songsData,
      song_count: rankedSongs.length,
      is_public: true, // Rankings are public by default
      status: status,
      ranking_state: rankingState || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving ranked list:', error)
    throw error
  }

  return data
}

/**
 * Save or update a draft ranking
 */
export async function saveDraftRanking(
  userId: string,
  draftId: string | null,
  rankingState: any,
  songs: any[],
  existingRankedSongs: any[],
  name?: string
): Promise<RankedList> {
  const supabase = await createClient()

  // Convert current ranked songs to RankedListSong format
  const rankedSongs = rankingState.ranked.map((song: Song, index: number) => ({
    musicbrainz_id: song.musicbrainzId || song.id,
    title: song.title,
    artist: song.artist,
    cover_art_url: song.coverArtUrl,
    album_title: song.albumTitle,
    album_musicbrainz_id: (song as any).albumId || null,
    rank: index + 1,
  }))

  const draftData = {
    user_id: userId,
    name: name || null,
    songs: rankedSongs,
    song_count: rankingState.ranked.length + rankingState.remaining.length,
    is_public: false, // Drafts are private
    status: 'draft' as const,
    ranking_state: {
      state: rankingState,
      songs: songs,
      existingRankedSongs: existingRankedSongs,
    },
  }

  if (draftId) {
    // Update existing draft
    const { data, error } = await supabase
      .from('ranked_lists')
      .update(draftData)
      .eq('id', draftId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating draft:', error)
      throw error
    }

    return data
  } else {
    // Create new draft
    const { data, error } = await supabase
      .from('ranked_lists')
      .insert(draftData)
      .select()
      .single()

    if (error) {
      console.error('Error saving draft:', error)
      throw error
    }

    return data
  }
}

/**
 * Get all ranked lists for a user (only completed, not drafts) (paginated)
 */
export async function getUserRankedLists(
  userId: string,
  page: number = 1,
  limit: number = 25
): Promise<{ rankings: RankedList[]; hasMore: boolean }> {
  const supabase = await createClient()
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await supabase
    .from('ranked_lists')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Error fetching ranked lists:', error)
    throw error
  }

  const rankings = data || []
  const hasMore = count ? from + rankings.length < count : false

  return { rankings, hasMore }
}

/**
 * Get all draft rankings for a user
 */
export async function getUserDrafts(userId: string): Promise<RankedList[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ranked_lists')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching drafts:', error)
    throw error
  }

  return data || []
}

/**
 * Get a draft ranking by ID
 */
export async function getDraftRanking(userId: string, draftId: string): Promise<RankedList | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ranked_lists')
    .select('*')
    .eq('id', draftId)
    .eq('user_id', userId)
    .eq('status', 'draft')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching draft:', error)
    throw error
  }

  return data
}

/**
 * Get a specific ranked list
 * Can access own rankings or public rankings
 */
export async function getRankedList(
  userId: string,
  listId: string
): Promise<RankedList | null> {
  const supabase = await createClient()

  // Allow access to own rankings OR public rankings
  const { data, error } = await supabase
    .from('ranked_lists')
    .select('*')
    .eq('id', listId)
    .or(`user_id.eq.${userId},is_public.eq.true`)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null
    }
    console.error('Error fetching ranked list:', error)
    throw error
  }

  return data
}

/**
 * Update a ranked list
 */
export async function updateRankedList(
  userId: string,
  listId: string,
  songs: RankedListSong[],
  name?: string | null,
  status?: 'draft' | 'completed'
): Promise<RankedList> {
  const supabase = await createClient()

  const songsData = songs.map((song, index) => ({
    ...song,
    rank: index + 1, // Update ranks based on new order
  }))

  const updateData: any = {
    songs: songsData,
    song_count: songs.length,
    updated_at: new Date().toISOString(),
  }

  // Only update name if provided
  if (name !== undefined) {
    updateData.name = name || null
  }

  // Update status if provided (e.g., mark draft as completed)
  if (status !== undefined) {
    updateData.status = status
    // Clear ranking_state and make public when completing a draft
    if (status === 'completed') {
      updateData.ranking_state = null
      updateData.is_public = true // Make it public by default when completing
    }
  }

  const { data, error } = await supabase
    .from('ranked_lists')
    .update(updateData)
    .eq('user_id', userId)
    .eq('id', listId)
    .select()
    .single()

  if (error) {
    console.error('Error updating ranked list:', error)
    throw error
  }

  return data
}

/**
 * Update the public/private status of a ranked list
 */
export async function updateRankedListVisibility(
  userId: string,
  listId: string,
  isPublic: boolean
): Promise<RankedList> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ranked_lists')
    .update({
      is_public: isPublic,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('id', listId)
    .select()
    .single()

  if (error) {
    console.error('Error updating ranked list visibility:', error)
    throw error
  }

  return data
}

/**
 * Delete a ranked list
 */
export async function deleteRankedList(
  userId: string,
  listId: string
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('ranked_lists')
    .delete()
    .eq('user_id', userId)
    .eq('id', listId)

  if (error) {
    console.error('Error deleting ranked list:', error)
    throw error
  }
}

/**
 * Get a ranked list by share token (public access)
 */
export async function getRankedListByShareToken(
  shareToken: string
): Promise<RankedList | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ranked_lists')
    .select('*')
    .eq('share_token', shareToken)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching ranked list by token:', error)
    throw error
  }

  return data
}

/**
 * Get public ranked lists for a user (paginated)
 */
export async function getPublicRankedLists(
  userId: string,
  page: number = 1,
  limit: number = 25
): Promise<{ rankings: RankedList[]; hasMore: boolean }> {
  const supabase = await createClient()
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await supabase
    .from('ranked_lists')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('is_public', true)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Error fetching public ranked lists:', error)
    throw error
  }

  const rankings = data || []
  const hasMore = count ? from + rankings.length < count : false

  return { rankings, hasMore }
}

/**
 * Generate or get existing share token for a ranked list
 * Preserves existing tokens to keep share links valid
 */
export async function generateShareToken(
  userId: string,
  listId: string
): Promise<string> {
  const supabase = await createClient()

  // First, check if a share token already exists
  const { data: existing } = await supabase
    .from('ranked_lists')
    .select('share_token')
    .eq('user_id', userId)
    .eq('id', listId)
    .single()

  // If a token already exists, return it (preserves existing share links)
  if (existing?.share_token) {
    // Still ensure it's public and update the timestamp
    await supabase
      .from('ranked_lists')
      .update({
        is_public: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('id', listId)

    return existing.share_token
  }

  // Generate a new token only if one doesn't exist
  const token = `share_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

  const { data, error } = await supabase
    .from('ranked_lists')
    .update({
      share_token: token,
      is_public: true, // Make it public when sharing
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('id', listId)
    .select('share_token')
    .single()

  if (error) {
    console.error('Error generating share token:', error)
    throw error
  }

  return data.share_token!
}

/**
 * Get ranked list for template use (can be public or owned by user)
 */
export async function getRankedListForTemplate(
  listId: string,
  userId?: string
): Promise<RankedList | null> {
  const supabase = await createClient()

  // Build query - can be owned by user OR public
  let query = supabase
    .from('ranked_lists')
    .select('*')
    .eq('id', listId)

  if (userId) {
    // If user is authenticated, they can access their own or public rankings
    query = query.or(`user_id.eq.${userId},is_public.eq.true`)
  } else {
    // If not authenticated, only public rankings
    query = query.eq('is_public', true)
  }

  const { data, error } = await query.single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching ranked list for template:', error)
    throw error
  }

  return data
}

