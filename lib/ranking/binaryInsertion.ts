/**
 * Binary insertion ranking algorithm
 * Efficiently ranks songs by inserting them one by one using binary search
 */

export type ComparisonResult = 'better' | 'worse' | 'dont_know'

export interface Song {
  id: string
  title: string
  artist: string
  coverArtUrl?: string
  albumTitle?: string
  musicbrainzId?: string
  spotifyUri?: string
}

export interface RankingState {
  ranked: Song[]
  remaining: Song[]
  currentComparison: {
    newSong: Song
    comparedSong: Song
    position: number // Position in ranked list (0-indexed)
    totalRanked: number
    searchLeft?: number // Original left bound of binary search
    searchRight?: number // Original right bound of binary search
  } | null
  isComplete: boolean
  totalComparisons: number
  estimatedRemaining: number
}

export class BinaryInsertionRanker {
  private ranked: Song[] = []
  private remaining: Song[]
  private comparisons: number = 0
  private onStateChange?: (state: RankingState) => void
  private currentComparison: RankingState['currentComparison'] = null // Track current comparison internally

  constructor(
    songs: Song[],
    onStateChange?: (state: RankingState) => void,
    existingRankedSongs?: Song[] // Songs already ranked in order
  ) {
    if (existingRankedSongs && existingRankedSongs.length > 0) {
      // Start with existing ranked songs
      this.ranked = [...existingRankedSongs]
      // Filter out songs that are already ranked from the new songs list
      const normalizeString = (str: string) => str.toLowerCase().trim()
      this.remaining = songs.filter(newSong => {
        return !existingRankedSongs.some(rankedSong => {
          const titleMatch = normalizeString(newSong.title) === normalizeString(rankedSong.title)
          const artistMatch = normalizeString(newSong.artist) === normalizeString(rankedSong.artist)
          const albumMatch = (!rankedSong.albumTitle && !newSong.albumTitle) ||
            (rankedSong.albumTitle && newSong.albumTitle &&
              normalizeString(rankedSong.albumTitle) === normalizeString(newSong.albumTitle))
          return titleMatch && artistMatch && albumMatch
        })
      })
    } else {
      this.remaining = [...songs]
    }
    this.onStateChange = onStateChange
  }

  /**
   * Initialize ranking with first 2 songs
   * Returns the initial comparison needed
   */
  initialize(): RankingState | null {
    if (this.remaining.length === 0) {
      return this.getState()
    }

    // If we already have ranked songs, start inserting new songs immediately
    if (this.ranked.length > 0) {
      return this.startNextInsertion()
    }

    if (this.remaining.length === 1) {
      this.ranked = [this.remaining[0]]
      this.remaining = []
      return this.getState()
    }

    // Need to compare first 2 songs
    this.currentComparison = {
      newSong: this.remaining[0],
      comparedSong: this.remaining[1],
      position: 0,
      totalRanked: 0,
      searchLeft: 0,
      searchRight: 0,
    }
    return this.getState()
  }

  /**
   * Handle initial comparison result
   */
  handleInitialComparison(result: ComparisonResult): RankingState {
    if (this.remaining.length < 2) {
      return this.getState()
    }

    // No history save here - history was saved when the initial comparison was created in initialize()

    const song1 = this.remaining.shift()!
    const song2 = this.remaining.shift()!

    if (result === 'dont_know') {
      // Skip first song, try with second
      if (this.remaining.length > 0) {
        const nextSong = this.remaining.shift()!
        this.ranked = [song2] // Start with just the second song if first is skipped
        this.comparisons++ // Count this as a comparison to establish initial rank
        this.currentComparison = null
        this.notifyStateChange()

        if (this.remaining.length > 0) {
          return this.startNextInsertion()
        }
        return this.getState()
      } else {
        // If only one song left after skipping, rank it
        this.ranked = [song2]
        this.comparisons++
        this.currentComparison = null
        return this.getState()
      }
    }

    // Establish initial ranking
    // "better" means song1 is better than song2
    this.ranked = result === 'better'
      ? [song1, song2]
      : [song2, song1]

    this.comparisons++
    this.currentComparison = null
    this.notifyStateChange()

    // Start inserting remaining songs
    if (this.remaining.length > 0) {
      return this.startNextInsertion()
    }

    return this.getState()
  }

  /**
   * Start binary insertion for next song
   */
  private startNextInsertion(): RankingState {
    if (this.remaining.length === 0) {
      return this.getState()
    }

    const newSong = this.remaining[0]
    return this.binarySearch(newSong, 0, this.ranked.length - 1, 0)
  }

  /**
   * Binary search to find insertion point
   */
  private binarySearch(
    newSong: Song,
    left: number,
    right: number,
    depth: number = 0
  ): RankingState {
    // Prevent infinite loops (safety check)
    if (depth > 20) {
      this.ranked.splice(left, 0, newSong)
      const remainingIndex = this.remaining.findIndex(s => s.id === newSong.id)
      if (remainingIndex !== -1) {
        this.remaining.splice(remainingIndex, 1)
      }
      this.currentComparison = null
      this.notifyStateChange()
      if (this.remaining.length > 0) {
        return this.startNextInsertion()
      }
      return this.getState()
    }

    if (left > right) {
      // Found insertion point
      this.ranked.splice(left, 0, newSong)

      // Remove from remaining (find by ID to be safe)
      const remainingIndex = this.remaining.findIndex(s => s.id === newSong.id)
      if (remainingIndex !== -1) {
        this.remaining.splice(remainingIndex, 1)
      } else {
        // Fallback: shift if not found
        this.remaining.shift()
      }

      this.currentComparison = null
      this.notifyStateChange()

      // Continue with next song
      if (this.remaining.length > 0) {
        return this.startNextInsertion()
      }

      return this.getState()
    }

    // When left === right, we still need to compare one more time
    const mid = Math.floor((left + right) / 2)

    // Safety check: ensure mid is within bounds
    if (mid < 0 || mid >= this.ranked.length) {
      // Insert at the end if mid is out of bounds
      const insertPos = mid < 0 ? 0 : this.ranked.length
      this.ranked.splice(insertPos, 0, newSong)
      const remainingIndex = this.remaining.findIndex(s => s.id === newSong.id)
      if (remainingIndex !== -1) {
        this.remaining.splice(remainingIndex, 1)
      }
      this.currentComparison = null
      this.notifyStateChange()

      if (this.remaining.length > 0) {
        return this.startNextInsertion()
      }
      return this.getState()
    }

    const comparedSong = this.ranked[mid]

    this.currentComparison = {
      newSong,
      comparedSong,
      position: mid,
      totalRanked: this.ranked.length,
      searchLeft: left, // Track the current search bounds
      searchRight: right,
    }

    return this.getState()
  }

  /**
   * Handle comparison result during binary search
   */
  handleComparison(result: ComparisonResult, currentComparison?: RankingState['currentComparison']): RankingState {
    // Use the passed currentComparison if available, otherwise try to get from state
    let comparison = currentComparison
    if (!comparison) {
      const state = this.getState()
      if (!state.currentComparison) {
        return state
      }
      comparison = state.currentComparison
    }

    const { newSong, comparedSong, position } = comparison

    if (result === 'dont_know') {
      // Skip this song, remove from remaining (no history save needed - the comparison was already saved when created)
      const index = this.remaining.findIndex(s => s.id === newSong.id)
      if (index !== -1) {
        this.remaining.splice(index, 1)
      }
      this.currentComparison = null
      this.notifyStateChange()

      // Continue with next song
      if (this.remaining.length > 0) {
        return this.startNextInsertion()
      }

      return this.getState()
    }

    // Process the comparison result (no history save here - history was saved when the comparison was created)
    this.comparisons++
    const mid = position

    // Get the original search bounds from the comparison state
    // If not available, use the full range (shouldn't happen, but safety check)
    const originalLeft = comparison.searchLeft ?? 0
    const originalRight = comparison.searchRight ?? (this.ranked.length - 1)

    // Update search bounds based on comparison result
    // If better: search in [originalLeft, mid-1] (positions before current, within original bounds)
    // If worse: search in [mid+1, originalRight] (positions after current, within original bounds)
    let left: number
    let right: number

    if (result === 'better') {
      left = originalLeft
      right = mid - 1
    } else {
      // worse
      left = mid + 1
      right = originalRight
    }

    // Safety check: if bounds are invalid, insert at appropriate position
    if (left > right) {
      // Insert at the position determined by the comparison
      const insertPos = result === 'better' ? mid : mid + 1
      this.ranked.splice(insertPos, 0, newSong)

      const remainingIndex = this.remaining.findIndex(s => s.id === newSong.id)
      if (remainingIndex !== -1) {
        this.remaining.splice(remainingIndex, 1)
      }
      this.currentComparison = null
      this.notifyStateChange()

      if (this.remaining.length > 0) {
        return this.startNextInsertion()
      }
      return this.getState()
    }

    // When left === right, we have one position left - compare with it and insert
    if (left === right) {
      // One final comparison needed
      const finalPos = left
      const finalSong = this.ranked[finalPos]
      this.currentComparison = {
        newSong,
        comparedSong: finalSong,
        position: finalPos,
        totalRanked: this.ranked.length,
        searchLeft: left,
        searchRight: right,
      }
      return this.getState()
    }

    // Continue binary search (depth starts at 0 for new search)
    return this.binarySearch(newSong, left, right, 0)
  }


  /**
   * Estimate remaining comparisons
   */
  private estimateRemaining(): number {
    if (this.remaining.length === 0) return 0
    if (this.ranked.length === 0) return 0

    // Each remaining song needs approximately log2(ranked.length) comparisons
    const comparisonsPerSong = Math.ceil(Math.log2(this.ranked.length + 1))
    return this.remaining.length * comparisonsPerSong
  }

  /**
   * Get current state
   */
  getState(): RankingState {
    return {
      ranked: [...this.ranked],
      remaining: [...this.remaining],
      currentComparison: this.currentComparison, // Return the internal currentComparison
      isComplete: this.remaining.length === 0 && this.ranked.length > 0,
      totalComparisons: this.comparisons,
      estimatedRemaining: this.estimateRemaining(),
    }
  }

  private notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange(this.getState())
    }
  }
}

