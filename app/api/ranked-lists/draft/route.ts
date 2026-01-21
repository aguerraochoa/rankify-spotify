import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { saveDraftRanking, getUserDrafts, getDraftRanking } from '@/lib/db/rankedLists'

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

    const { searchParams } = new URL(request.url)
    const draftId = searchParams.get('id')

    if (draftId) {
      // Get specific draft
      const draft = await getDraftRanking(user.id, draftId)
      if (!draft) {
        return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
      }
      return NextResponse.json({ draft })
    } else {
      // Get all drafts
      const drafts = await getUserDrafts(user.id)
      return NextResponse.json({ drafts })
    }
  } catch (error) {
    console.error('Error fetching drafts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch drafts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { rankingState, songs, existingRankedSongs, name, draftId } = body

    if (!rankingState) {
      return NextResponse.json(
        { error: 'Ranking state is required' },
        { status: 400 }
      )
    }

    const draft = await saveDraftRanking(
      user.id,
      draftId || null,
      rankingState,
      songs || [],
      existingRankedSongs || [],
      name
    )

    return NextResponse.json({ draft })
  } catch (error) {
    console.error('Error saving draft:', error)
    return NextResponse.json(
      { error: 'Failed to save draft' },
      { status: 500 }
    )
  }
}

