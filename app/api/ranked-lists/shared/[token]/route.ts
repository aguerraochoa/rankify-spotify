import { NextRequest, NextResponse } from 'next/server'
import { getRankedListByShareToken } from '@/lib/db/rankedLists'
import { getUserProfile } from '@/lib/db/users'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const shareToken = params.token

    // Get ranking by share token (no auth required)
    const ranking = await getRankedListByShareToken(shareToken)

    if (!ranking) {
      return NextResponse.json(
        { error: 'Ranking not found' },
        { status: 404 }
      )
    }

    // Get user profile for display
    const userProfile = await getUserProfile(ranking.user_id)

    return NextResponse.json({
      ranking,
      user: userProfile
        ? {
            id: userProfile.id,
            email: userProfile.email,
            username: userProfile.username,
            display_name: userProfile.display_name,
          }
        : null,
    })
  } catch (error) {
    console.error('Error fetching shared ranking:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shared ranking' },
      { status: 500 }
    )
  }
}

