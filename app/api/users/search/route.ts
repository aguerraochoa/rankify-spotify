import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchUsers } from '@/lib/db/users'
import { getPublicRankedLists } from '@/lib/db/rankedLists'

// Mark this route as dynamic since it uses cookies for authentication
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
    }

    const users = await searchUsers(query.trim(), limit)

    // Don't return the current user in search results
    const filteredUsers = users.filter((u) => u.id !== user.id)

    // Add public rankings count for each user
    const usersWithCounts = await Promise.all(
      filteredUsers.map(async (userProfile) => {
        const { rankings: publicRankings } = await getPublicRankedLists(userProfile.id)
        return {
          ...userProfile,
          public_rankings_count: publicRankings.length,
        }
      })
    )

    return NextResponse.json({ users: usersWithCounts })
  } catch (error) {
    console.error('Error searching users:', error)
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    )
  }
}

