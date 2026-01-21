import { NextRequest, NextResponse } from 'next/server'
import { getCoverArtUrl } from '@/lib/musicbrainz/client'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const releaseGroupId = searchParams.get('releaseGroupId')

  if (!releaseGroupId) {
    return NextResponse.json(
      { error: 'releaseGroupId parameter is required' },
      { status: 400 }
    )
  }

  try {
    const coverArtUrl = await getCoverArtUrl(releaseGroupId)
    return NextResponse.json({ coverArtUrl })
  } catch (error) {
    console.error('Error fetching cover art:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cover art' },
      { status: 500 }
    )
  }
}

