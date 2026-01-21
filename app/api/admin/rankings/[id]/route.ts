import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin/checkAdmin'
import { getAdminRanking } from '@/lib/admin/rankings'
import { deleteRankedList } from '@/lib/db/rankedLists'

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

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(user.id)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const ranking = await getAdminRanking(params.id)
    if (!ranking) {
      return NextResponse.json({ error: 'Ranking not found' }, { status: 404 })
    }

    return NextResponse.json({ ranking })
  } catch (error) {
    console.error('Error fetching ranking:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ranking' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Check if user is admin
    const userIsAdmin = await isAdmin(user.id)
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get ranking to find owner
    const ranking = await getAdminRanking(params.id)
    if (!ranking) {
      return NextResponse.json({ error: 'Ranking not found' }, { status: 404 })
    }

    // Delete the ranking (admin can delete any ranking)
    await deleteRankedList(ranking.user_id, params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting ranking:', error)
    return NextResponse.json(
      { error: 'Failed to delete ranking' },
      { status: 500 }
    )
  }
}

