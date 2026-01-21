import { createClient } from '@/lib/supabase/server'

export interface UserProfile {
  id: string
  email: string | null
  username: string | null
  display_name: string | null
  bio: string | null
  is_admin?: boolean
  created_at: string
  updated_at: string
}

/**
 * Get a user profile by ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching user profile:', error)
    throw error
  }

  return data
}

/**
 * Search users by email or username
 */
export async function searchUsers(
  query: string,
  limit: number = 20
): Promise<UserProfile[]> {
  const supabase = await createClient()

  // Search by email (partial match) or username (partial match)
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`email.ilike.%${query}%,username.ilike.%${query}%`)
    .limit(limit)

  if (error) {
    console.error('Error searching users:', error)
    throw error
  }

  return data || []
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: {
    username?: string
    display_name?: string
    bio?: string
  }
): Promise<UserProfile> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating user profile:', error)
    throw error
  }

  return data
}

