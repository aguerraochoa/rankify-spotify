import { NextRequest, NextResponse } from 'next/server'
import { getFollowingUsers } from '@/lib/db/follows'

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

        const { users, hasMore } = await getFollowingUsers(userId, page, limit)

        return NextResponse.json({ users, hasMore })
    } catch (error) {
        console.error('Error fetching following:', error)
        return NextResponse.json(
            { error: 'Failed to fetch following' },
            { status: 500 }
        )
    }
}
