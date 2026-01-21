import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/db/users'
import { getFollowCounts } from '@/lib/db/follows'

export interface AdminUser {
  id: string
  email: string | null
  username: string | null
  display_name: string | null
  bio: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
  rankings_count: number
  public_rankings_count: number
  drafts_count: number
  followers_count: number
  following_count: number
}

/**
 * Get all users for admin panel
 */
export async function getAllUsers(searchQuery?: string, limit: number = 100): Promise<AdminUser[]> {
  const supabase = await createClient()

  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (searchQuery && searchQuery.trim()) {
    query = query.or(`email.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
  }

  const { data: profiles, error } = await query

  if (error) {
    console.error('Error fetching users:', error)
    throw error
  }

  // Get additional stats for each user
  const usersWithStats = await Promise.all(
    (profiles || []).map(async (profile) => {
      // Get rankings counts
      const [allRankings, publicRankings, drafts] = await Promise.all([
        supabase
          .from('ranked_lists')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id),
        supabase
          .from('ranked_lists')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('is_public', true),
        supabase
          .from('ranked_lists')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('status', 'draft'),
      ])

      // Get follow counts
      const followCounts = await getFollowCounts(profile.id)

      return {
        ...profile,
        rankings_count: allRankings.count || 0,
        public_rankings_count: publicRankings.count || 0,
        drafts_count: drafts.count || 0,
        followers_count: followCounts.followers || 0,
        following_count: followCounts.following || 0,
      }
    })
  )

  return usersWithStats
}

/**
 * Get a single user with full details for admin
 */
export async function getAdminUser(userId: string): Promise<AdminUser | null> {
  const profile = await getUserProfile(userId)
  if (!profile) return null

  const supabase = await createClient()

  // Get rankings counts
  const [allRankings, publicRankings, drafts] = await Promise.all([
    supabase
      .from('ranked_lists')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('ranked_lists')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_public', true),
    supabase
      .from('ranked_lists')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'draft'),
  ])

  // Get follow counts
  const followCounts = await getFollowCounts(userId)

  return {
    ...profile,
    is_admin: profile.is_admin || false,
    rankings_count: allRankings.count || 0,
    public_rankings_count: publicRankings.count || 0,
    drafts_count: drafts.count || 0,
    followers_count: followCounts.followers || 0,
    following_count: followCounts.following || 0,
  }
}

