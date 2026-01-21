import { getUserProfile } from '@/lib/db/users'

/**
 * Check if a user is an admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const profile = await getUserProfile(userId)
    return profile?.is_admin === true
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

