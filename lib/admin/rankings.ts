import { createClient } from '@/lib/supabase/server'
import { RankedList } from '@/lib/db/rankedLists'

export interface AdminRanking extends RankedList {
  owner_email: string | null
  owner_username: string | null
  owner_display_name: string | null
}

/**
 * Get all rankings for admin panel
 */
export async function getAllRankings(
  status?: 'draft' | 'completed',
  limit: number = 100
): Promise<AdminRanking[]> {
  const supabase = await createClient()

  let query = supabase
    .from('ranked_lists')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) {
    query = query.eq('status', status)
  }

  const { data: rankings, error } = await query

  if (error) {
    console.error('Error fetching rankings:', error)
    throw error
  }

  // Get owner profiles
  const ownerIds = Array.from(new Set((rankings || []).map(r => r.user_id)))
  const { data: ownerProfiles } = ownerIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, email, username, display_name')
        .in('id', ownerIds)
    : { data: [] }

  const ownerMap = new Map(ownerProfiles?.map(p => [p.id, p]) || [])

  return (rankings || []).map(ranking => ({
    ...ranking,
    owner_email: ownerMap.get(ranking.user_id)?.email || null,
    owner_username: ownerMap.get(ranking.user_id)?.username || null,
    owner_display_name: ownerMap.get(ranking.user_id)?.display_name || null,
  }))
}

/**
 * Get a single ranking with owner info for admin
 */
export async function getAdminRanking(rankingId: string): Promise<AdminRanking | null> {
  const supabase = await createClient()

  const { data: ranking, error } = await supabase
    .from('ranked_lists')
    .select('*')
    .eq('id', rankingId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching ranking:', error)
    throw error
  }

  // Get owner profile
  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('email, username, display_name')
    .eq('id', ranking.user_id)
    .single()

  return {
    ...ranking,
    owner_email: ownerProfile?.email || null,
    owner_username: ownerProfile?.username || null,
    owner_display_name: ownerProfile?.display_name || null,
  }
}

