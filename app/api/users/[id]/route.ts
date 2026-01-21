import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile, updateUserProfile } from '@/lib/db/users'
import { getFollowCounts, isFollowing } from '@/lib/db/follows'
import { getPublicRankedLists } from '@/lib/db/rankedLists'

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

    const userId = params.id

    // Get user profile
    const profile = await getUserProfile(userId)
    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get follow counts
    const followCounts = await getFollowCounts(userId)

    // Check if current user is following this user
    let isFollowingUser = false
    if (user) {
      isFollowingUser = await isFollowing(user.id, userId)
    }

    // Get public rankings
    const { rankings: publicRankings } = await getPublicRankedLists(userId)

    return NextResponse.json({
      profile: {
        ...profile,
        ...followCounts,
      },
      isFollowing: isFollowingUser,
      publicRankings,
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = params.id

    // Users can only update their own profile
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { username, display_name, bio } = body

    // Validate username format if provided
    if (username !== undefined && username !== null && username !== '') {
      // Username must be 3-30 characters, alphanumeric and underscores/hyphens only
      const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/
      if (!usernameRegex.test(username)) {
        return NextResponse.json(
          { error: 'Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens' },
          { status: 400 }
        )
      }

      // Check if username is already taken by another user
      const supabaseClient = await createClient()
      const { data: existingUser } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', userId)
        .single()

      if (existingUser) {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 409 }
        )
      }
    }

    // Validate bio length if provided
    if (bio !== undefined && bio !== null && bio.length > 160) {
      return NextResponse.json(
        { error: 'Bio must be 160 characters or less' },
        { status: 400 }
      )
    }

    // Update profile
    const updatedProfile = await updateUserProfile(userId, {
      username: username || null,
      display_name: display_name || null,
      bio: bio || null,
    })

    return NextResponse.json({ profile: updatedProfile })
  } catch (error: any) {
    console.error('Error updating user profile:', error)

    // Handle unique constraint violation
    if (error.code === '23505' || error.message?.includes('unique')) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

