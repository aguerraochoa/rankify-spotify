import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { saveRankedList, getUserRankedLists } from '@/lib/db/rankedLists'

// Mark this route as dynamic since it uses cookies for authentication
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { rankings } = await getUserRankedLists(user.id, 1, 100)
    return NextResponse.json({ lists: rankings })
  } catch (error) {
    console.error('Error fetching ranked lists:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ranked lists' },
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
    const { songs, name, status, rankingState } = body

    if (!songs || !Array.isArray(songs)) {
      return NextResponse.json(
        { error: 'Songs array is required' },
        { status: 400 }
      )
    }

    const list = await saveRankedList(user.id, songs, name, status || 'completed', rankingState)
    return NextResponse.json({ list })
  } catch (error) {
    console.error('Error saving ranked list:', error)
    return NextResponse.json(
      { error: 'Failed to save ranked list' },
      { status: 500 }
    )
  }
}

