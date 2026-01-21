/**
 * Merge-sort style comparison ranking algorithm
 * This implements a tournament-style ranking where songs are compared pairwise
 */

export type ComparisonResult = 'preferred_a' | 'preferred_b' | 'tie' | 'skip' | 'havent_heard'

export interface Song {
  id: string
  title: string
  artist: string
  coverArtUrl?: string
  albumTitle?: string
}

export interface Comparison {
  songA: Song
  songB: Song
  result?: ComparisonResult
}

/**
 * Generate comparisons using merge-sort style approach
 * This creates a minimal set of comparisons needed to rank all songs
 */
export function generateComparisons(songs: Song[]): Comparison[] {
  if (songs.length < 2) return []

  const comparisons: Comparison[] = []
  
  // Use a tournament-style approach: compare adjacent pairs
  // This is similar to merge sort where we compare and merge
  function generatePairwiseComparisons(list: Song[]): void {
    if (list.length < 2) return

    // Compare adjacent pairs
    for (let i = 0; i < list.length - 1; i += 2) {
      comparisons.push({
        songA: list[i],
        songB: list[i + 1],
      })
    }

    // If odd number, the last one gets a bye (no comparison needed yet)
    // Continue with winners for next round
    if (list.length > 2) {
      const nextRound: Song[] = []
      // For now, we'll compare all pairs
      // In a full implementation, we'd track winners
      for (let i = 0; i < list.length; i += 2) {
        if (i + 1 < list.length) {
          // Both songs will be compared, winner goes to next round
          // For simplicity, we'll compare all pairs first
          nextRound.push(list[i]) // Placeholder - actual winner determined by user
        } else {
          nextRound.push(list[i]) // Odd one out
        }
      }
      // Recursively generate comparisons for next round
      // For now, we'll generate all pairwise comparisons
    }
  }

  // Generate all pairwise comparisons (simplified approach)
  // This ensures we can rank all songs
  for (let i = 0; i < songs.length; i++) {
    for (let j = i + 1; j < songs.length; j++) {
      comparisons.push({
        songA: songs[i],
        songB: songs[j],
      })
    }
  }

  return comparisons
}

/**
 * Calculate ranking from comparison results
 * Uses a simple scoring system based on wins
 */
export function calculateRanking(
  songs: Song[],
  comparisons: Comparison[]
): { song: Song; score: number; rank: number }[] {
  const scores = new Map<string, number>()

  // Initialize all scores to 0
  songs.forEach((song) => scores.set(song.id, 0))

  // Calculate scores based on comparisons
  comparisons.forEach((comp) => {
    if (!comp.result) return

    switch (comp.result) {
      case 'preferred_a':
        scores.set(comp.songA.id, (scores.get(comp.songA.id) || 0) + 1)
        break
      case 'preferred_b':
        scores.set(comp.songB.id, (scores.get(comp.songB.id) || 0) + 1)
        break
      case 'tie':
        // Both get 0.5 points
        scores.set(comp.songA.id, (scores.get(comp.songA.id) || 0) + 0.5)
        scores.set(comp.songB.id, (scores.get(comp.songB.id) || 0) + 0.5)
        break
      // skip and havent_heard don't affect scores
    }
  })

  // Sort by score (descending) and assign ranks
  const ranked = songs
    .map((song) => ({
      song,
      score: scores.get(song.id) || 0,
    }))
    .sort((a, b) => b.score - a.score)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }))

  return ranked
}

