import { createClient } from '@/lib/supabase/server'

export interface AdminStats {
  totalUsers: number
  totalRankings: number
  totalPublicRankings: number
  totalDrafts: number
  recentUsers: Array<{
    id: string
    email: string | null
    username: string | null
    display_name: string | null
    created_at: string
  }>
  recentRankings: Array<{
    id: string
    name: string | null
    user_id: string
    song_count: number
    is_public: boolean
    status: string
    created_at: string
    owner_email: string | null
    owner_username: string | null
  }>
}

/**
 * Get admin dashboard statistics
 */
export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient()

  // Get total counts
  const [usersResult, rankingsResult, publicRankingsResult, draftsResult] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('ranked_lists').select('id', { count: 'exact', head: true }),
    supabase.from('ranked_lists').select('id', { count: 'exact', head: true }).eq('is_public', true),
    supabase.from('ranked_lists').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
  ])

  // Get recent users (last 10)
  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('id, email, username, display_name, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  // Get recent rankings (last 10) with owner info
  const { data: recentRankings } = await supabase
    .from('ranked_lists')
    .select('id, name, user_id, song_count, is_public, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  // Get owner profiles for recent rankings
  const ownerIds = recentRankings?.map(r => r.user_id) || []
  const { data: ownerProfiles } = ownerIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, email, username')
        .in('id', ownerIds)
    : { data: [] }

  const ownerMap = new Map(ownerProfiles?.map(p => [p.id, p]) || [])

  const rankingsWithOwners = recentRankings?.map(ranking => ({
    ...ranking,
    owner_email: ownerMap.get(ranking.user_id)?.email || null,
    owner_username: ownerMap.get(ranking.user_id)?.username || null,
  })) || []

  return {
    totalUsers: usersResult.count || 0,
    totalRankings: rankingsResult.count || 0,
    totalPublicRankings: publicRankingsResult.count || 0,
    totalDrafts: draftsResult.count || 0,
    recentUsers: recentUsers || [],
    recentRankings: rankingsWithOwners,
  }
}

