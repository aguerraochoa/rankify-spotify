import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRankedList, deleteRankedList, updateRankedList, updateRankedListVisibility } from '@/lib/db/rankedLists'
import { getUserProfile } from '@/lib/db/users'

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

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const list = await getRankedList(user.id, params.id)

    if (!list) {
      return NextResponse.json({ error: 'Ranking not found' }, { status: 404 })
    }

    // Get user profile information for the ranking owner
    let ownerProfile = null
    if (list.user_id) {
      try {
        ownerProfile = await getUserProfile(list.user_id)
      } catch (err) {
        console.error('Error fetching owner profile:', err)
        // Continue without profile info if it fails
      }
    }

    return NextResponse.json({
      list,
      owner: ownerProfile ? {
        id: ownerProfile.id,
        username: ownerProfile.username,
        display_name: ownerProfile.display_name,
        email: ownerProfile.email,
      } : null
    })
  } catch (error) {
    console.error('Error fetching ranked list:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ranked list' },
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

    const body = await request.json()
    const { songs, name, status } = body

    if (!songs || !Array.isArray(songs)) {
      return NextResponse.json(
        { error: 'Songs array is required' },
        { status: 400 }
      )
    }

    const list = await updateRankedList(user.id, params.id, songs, name, status)

    // Get user profile information for the ranking owner
    let ownerProfile = null
    if (list.user_id) {
      try {
        ownerProfile = await getUserProfile(list.user_id)
      } catch (err) {
        console.error('Error fetching owner profile:', err)
        // Continue without profile info if it fails
      }
    }

    return NextResponse.json({
      list,
      owner: ownerProfile ? {
        id: ownerProfile.id,
        username: ownerProfile.username,
        display_name: ownerProfile.display_name,
        email: ownerProfile.email,
      } : null
    })
  } catch (error) {
    console.error('Error updating ranked list:', error)
    return NextResponse.json(
      { error: 'Failed to update ranked list' },
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

    await deleteRankedList(user.id, params.id)
    return NextResponse.json({ message: 'Ranking deleted successfully' })
  } catch (error) {
    console.error('Error deleting ranked list:', error)
    return NextResponse.json(
      { error: 'Failed to delete ranked list' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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

    const body = await request.json()
    const { is_public } = body

    if (typeof is_public !== 'boolean') {
      return NextResponse.json(
        { error: 'is_public boolean is required' },
        { status: 400 }
      )
    }

    const list = await updateRankedListVisibility(user.id, params.id, is_public)

    return NextResponse.json({ list })
  } catch (error) {
    console.error('Error updating ranked list visibility:', error)
    return NextResponse.json(
      { error: 'Failed to update ranked list visibility' },
      { status: 500 }
    )
  }
}

