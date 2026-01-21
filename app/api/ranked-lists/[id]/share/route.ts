import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateShareToken } from '@/lib/db/rankedLists'

// Mark this route as dynamic since it uses cookies for authentication
export const dynamic = 'force-dynamic'

export async function POST(
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

    const listId = params.id

    // Generate share token
    const shareToken = await generateShareToken(user.id, listId)

    // Return the shareable URL
    const shareUrl = `${request.nextUrl.origin}/rankings/shared/${shareToken}`

    return NextResponse.json({
      shareToken,
      shareUrl,
    })
  } catch (error) {
    console.error('Error generating share token:', error)
    return NextResponse.json(
      { error: 'Failed to generate share link' },
      { status: 500 }
    )
  }
}

