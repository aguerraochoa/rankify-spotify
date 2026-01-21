export interface RankedSong {
  musicbrainz_id?: string
  title: string
  artist: string
  cover_art_url?: string
  album_title?: string
  rank?: number
}

export interface ComparisonResult {
  similarity: number // 0-100
  sharedSongs: SharedSongComparison[]
  onlyInYourList: RankedSong[]
  onlyInTheirList: RankedSong[]
}

export interface SharedSongComparison {
  song: RankedSong
  yourRank: number // Re-ranked position in your list
  theirRank: number // Re-ranked position in their list
  positionDiff: number // Positive = higher in their list, negative = lower
  indicator: 'up' | 'down' | 'same'
  diffAmount: number // Absolute difference amount
}

/**
 * Get unique identifier for a song
 */
export function getSongId(song: RankedSong): string {
  // Normalize strings for broader matching
  // Remove special characters, extra spaces, and convert to lowercase
  const normalize = (str: string) => str.toLowerCase().trim().replace(/[^a-z0-9 ]/g, '')
  return `${normalize(song.title)}|${normalize(song.artist)}`
}

/**
 * Find songs that exist in both lists
 */
export function findSharedSongs(
  yourSongs: RankedSong[],
  theirSongs: RankedSong[]
): RankedSong[] {
  const yourSongIds = new Set(yourSongs.map(getSongId))
  const theirSongIds = new Set(theirSongs.map(getSongId))

  const sharedIds = new Set<string>()
  yourSongIds.forEach(id => {
    if (theirSongIds.has(id)) {
      sharedIds.add(id)
    }
  })

  // Return songs from your list that are shared (preserve order)
  return yourSongs.filter(song => sharedIds.has(getSongId(song)))
}

/**
 * Re-rank songs using only shared songs (ignoring unique songs)
 */
export function reRankSongs(
  songs: RankedSong[],
  sharedSongIds: Set<string>
): Map<string, number> {
  const ranks = new Map<string, number>()
  let rank = 1

  songs.forEach(song => {
    const id = getSongId(song)
    if (sharedSongIds.has(id)) {
      ranks.set(id, rank)
      rank++
    }
  })

  return ranks
}

/**
 * Calculate position differences for shared songs
 */
export function calculatePositionDifferences(
  yourSongs: RankedSong[],
  theirSongs: RankedSong[]
): SharedSongComparison[] {
  const sharedSongs = findSharedSongs(yourSongs, theirSongs)
  const sharedIds = new Set(sharedSongs.map(getSongId))

  const yourRanks = reRankSongs(yourSongs, sharedIds)
  const theirRanks = reRankSongs(theirSongs, sharedIds)

  return sharedSongs.map(song => {
    const id = getSongId(song)
    const yourRank = yourRanks.get(id) || 0
    const theirRank = theirRanks.get(id) || 0
    const diff = theirRank - yourRank

    let indicator: 'up' | 'down' | 'same'
    if (diff > 0) {
      indicator = 'down'
    } else if (diff < 0) {
      indicator = 'up'
    } else {
      indicator = 'same'
    }

    return {
      song,
      yourRank,
      theirRank,
      positionDiff: diff,
      indicator,
      diffAmount: Math.abs(diff),
    }
  })
}

/**
 * Calculate Spearman's rank correlation coefficient
 * Returns a value between -1 and 1, which we convert to 0-100%
 */
export function calculateSimilarity(
  yourSongs: RankedSong[],
  theirSongs: RankedSong[]
): number {
  const sharedSongs = findSharedSongs(yourSongs, theirSongs)
  const n = sharedSongs.length

  // Edge cases
  if (n === 0) return 0
  if (n === 1) return 100 // Only one shared song = perfect match

  const sharedIds = new Set(sharedSongs.map(getSongId))
  const yourRanks = reRankSongs(yourSongs, sharedIds)
  const theirRanks = reRankSongs(theirSongs, sharedIds)

  // Calculate sum of squared differences
  let sumDiffSquared = 0
  sharedSongs.forEach(song => {
    const id = getSongId(song)
    const yourRank = yourRanks.get(id) || 0
    const theirRank = theirRanks.get(id) || 0
    const diff = yourRank - theirRank
    sumDiffSquared += diff * diff
  })

  // Spearman's formula: ρ = 1 - (6 × Σd²) / (n × (n² - 1))
  const spearman = 1 - (6 * sumDiffSquared) / (n * (n * n - 1))

  // Convert from [-1, 1] to [0, 100]
  const similarity = ((spearman + 1) / 2) * 100

  return Math.round(similarity)
}

/**
 * Get songs only in your list
 */
export function getOnlyInYourList(
  yourSongs: RankedSong[],
  theirSongs: RankedSong[]
): RankedSong[] {
  const theirSongIds = new Set(theirSongs.map(getSongId))
  return yourSongs.filter(song => !theirSongIds.has(getSongId(song)))
}

/**
 * Get songs only in their list
 */
export function getOnlyInTheirList(
  yourSongs: RankedSong[],
  theirSongs: RankedSong[]
): RankedSong[] {
  const yourSongIds = new Set(yourSongs.map(getSongId))
  return theirSongs.filter(song => !yourSongIds.has(getSongId(song)))
}

/**
 * Main comparison function
 */
export function compareRankings(
  yourSongs: RankedSong[],
  theirSongs: RankedSong[]
): ComparisonResult {
  const similarity = calculateSimilarity(yourSongs, theirSongs)
  const sharedComparisons = calculatePositionDifferences(yourSongs, theirSongs)
  const onlyInYour = getOnlyInYourList(yourSongs, theirSongs)
  const onlyInTheir = getOnlyInTheirList(yourSongs, theirSongs)

  return {
    similarity,
    sharedSongs: sharedComparisons,
    onlyInYourList: onlyInYour,
    onlyInTheirList: onlyInTheir,
  }
}

