import { NextRequest, NextResponse } from 'next/server'
import { searchRecordings, searchReleaseGroups } from '@/lib/musicbrainz/client'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const type = searchParams.get('type') || 'recording' // 'recording' or 'release-group'
  const limit = parseInt(searchParams.get('limit') || '10', 10)
  const filterStudioAlbums = searchParams.get('filterStudioAlbums') === 'true' // New parameter

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
  }

  try {
    let results
    if (type === 'release-group') {
      results = await searchReleaseGroups(query, limit, filterStudioAlbums)
    } else {
      results = await searchRecordings(query, limit)
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Error searching music:', error)
    return NextResponse.json(
      { error: 'Failed to search music' },
      { status: 500 }
    )
  }
}

