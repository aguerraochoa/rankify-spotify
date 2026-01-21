import { NextRequest, NextResponse } from 'next/server'
import { getFollowersUsers } from '@/lib/db/follows'

export const dynamic = 'force-dynamic'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = params.id
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '25')

        const { users, hasMore } = await getFollowersUsers(userId, page, limit)

        return NextResponse.json({ users, hasMore })
    } catch (error) {
        console.error('Error fetching followers:', error)
        return NextResponse.json(
            { error: 'Failed to fetch followers' },
            { status: 500 }
        )
    }
}
