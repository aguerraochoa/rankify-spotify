interface RankedSong {
  title: string
  artist: string
  cover_art_url?: string
  album_title?: string
  musicbrainz_id?: string
  rank?: number
}

interface RankingData {
  name: string | null
  songs: RankedSong[]
  created_at: string
}

// Helper function to load an image
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}

// Helper function to wrap text
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(' ')
  let line = ''
  let currentY = y

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' '
    const metrics = ctx.measureText(testLine)
    const testWidth = metrics.width
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY)
      line = words[n] + ' '
      currentY += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, x, currentY)
  return currentY + lineHeight
}

export async function generateRankingImage(ranking: RankingData): Promise<void> {
  // Check if we're on mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  
  // Canvas dimensions (receipt width)
  const width = 384
  const padding = 20
  const contentWidth = width - (padding * 2)
  
  // Create canvas
  const canvas = document.createElement('canvas')
  const scale = isMobile ? 1.5 : 2
  canvas.width = width * scale
  canvas.height = 2000 * scale // Start with large height, will trim later
  const ctx = canvas.getContext('2d')
  
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Scale context
  ctx.scale(scale, scale)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, 2000)

  // Start with padding at top - match the bottom spacing
  // Bottom has: 15px after URL + 20px padding = 35px total
  // Top should have similar visual spacing, accounting for text baseline
  let y = padding + 35 // Match bottom spacing (15px + 20px padding)

  // Header
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'center'
  ctx.font = 'bold 24px monospace'
  ctx.fillText('RANKIFY', width / 2, y)
  y += 30

  ctx.font = '12px monospace'
  ctx.fillStyle = '#666666'
  const subtitle = (ranking.name || 'MY RANKING').toUpperCase()
  ctx.fillText(subtitle, width / 2, y)
  y += 20

  // Date
  const date = new Date(ranking.created_at)
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  ctx.font = '10px monospace'
  ctx.fillStyle = '#999999'
  ctx.fillText(formattedDate.toUpperCase(), width / 2, y)
  y += 20

  // Divider
  ctx.strokeStyle = '#000000'
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(padding, y)
  ctx.lineTo(width - padding, y)
  ctx.stroke()
  ctx.setLineDash([])
  y += 20

  // Songs list
  ctx.textAlign = 'left'
  ctx.font = '11px monospace'
  ctx.fillStyle = '#000000'

  for (let i = 0; i < ranking.songs.length; i++) {
    const song = ranking.songs[i]
    const rank = String(i + 1).padStart(2, '0')
    
    // Rank number
    ctx.font = 'bold 11px monospace'
    ctx.fillText(rank, padding, y)
    
    // Song info
    const songText = `${song.title.toUpperCase()} - ${song.artist.toUpperCase()}`
    ctx.font = '11px monospace'
    const textX = padding + 30
    const maxTextWidth = contentWidth - 30
    
    // Measure text and wrap if needed
    const metrics = ctx.measureText(songText)
    if (metrics.width > maxTextWidth) {
      y = wrapText(ctx, songText, textX, y, maxTextWidth, 14)
    } else {
      ctx.fillText(songText, textX, y)
      y += 14
    }
    
    y += 2 // Extra spacing
  }

  y += 10

  // Divider
  ctx.strokeStyle = '#000000'
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(padding, y)
  ctx.lineTo(width - padding, y)
  ctx.stroke()
  ctx.setLineDash([])
  y += 20

  // Footer
  ctx.textAlign = 'center'
  ctx.font = 'bold 10px monospace'
  ctx.fillStyle = '#000000'
  ctx.fillText('RANK YOUR MUSIC WITH PRECISION', width / 2, y)
  y += 15

  ctx.font = '10px monospace'
  ctx.fillStyle = '#999999'
  ctx.fillText('rankify-music.vercel.app', width / 2, y)
  // No extra space after URL - padding will be added in height calculation

  // Trim canvas to actual content height (add padding at bottom to match top)
  // Top: padding (20px) + 35px = 55px total
  // Bottom: padding (20px) + 35px = 55px total (matching top)
  const actualHeight = Math.ceil(y + padding + 35) // Match the top padding (padding + 35)
  const trimmedCanvas = document.createElement('canvas')
  trimmedCanvas.width = width * scale
  trimmedCanvas.height = actualHeight * scale
  const trimmedCtx = trimmedCanvas.getContext('2d')
  
  if (!trimmedCtx) {
    throw new Error('Failed to get trimmed canvas context')
  }

  trimmedCtx.drawImage(canvas, 0, 0, width * scale, actualHeight * scale, 0, 0, width * scale, actualHeight * scale)

  // Convert to blob
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    try {
      trimmedCanvas.toBlob(
        (blob) => {
          resolve(blob)
        },
        'image/png',
        0.95
      )
      // Timeout for blob conversion
      setTimeout(() => {
        reject(new Error('Blob conversion timed out'))
      }, 5000)
    } catch (error) {
      reject(error)
    }
  })

  if (!blob) {
    throw new Error('Failed to create image blob')
  }

  const fileName = `${(ranking.name || 'my_ranking').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_ranking.png`
  const url = URL.createObjectURL(blob)

  // Strategy 1: Try Share API on mobile (best UX on iOS/Android)
  // Check if Share API supports files (not all browsers do)
  const shareSupported = 'share' in navigator && 'canShare' in navigator
  if (isMobile && shareSupported) {
    try {
      const file = new File([blob], fileName, {
        type: 'image/png',
      })
      
      // Check if we can share this file
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: ranking.name || 'My Ranking',
        })
        URL.revokeObjectURL(url)
        return // Successfully shared
      }
    } catch (shareError: any) {
      // If share is cancelled by user, that's fine - don't show error
      if (shareError.name === 'AbortError') {
        URL.revokeObjectURL(url)
        return // User cancelled, exit gracefully
      }
      // If share fails for other reasons, fall through to download
      console.warn('Share API failed, falling back to download:', shareError)
    }
  }

  // Strategy 2: Desktop - use download link (works reliably on desktop)
  if (!isMobile) {
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.style.display = 'none'
    
    document.body.appendChild(link)
    
    // Small delay to ensure link is in DOM
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Trigger download (must be from user gesture, which it is)
    link.click()
    
    // Clean up after a delay
    setTimeout(() => {
      if (link.parentNode) {
        document.body.removeChild(link)
      }
      URL.revokeObjectURL(url)
    }, 1000)
    return
  }

  // Strategy 3: Mobile - try download link, with fallback to opening in new window
  // iOS Safari often blocks downloads, so we need a fallback
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  
  document.body.appendChild(link)
  await new Promise(resolve => setTimeout(resolve, 50))
  link.click()
  
  // Also try opening in new window as backup (works when download is blocked)
  // This is especially useful for iOS Safari
  setTimeout(() => {
    try {
      const newWindow = window.open(url, '_blank')
      
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Popup blocked, try link approach
        const fallbackLink = document.createElement('a')
        fallbackLink.href = url
        fallbackLink.target = '_blank'
        fallbackLink.rel = 'noopener noreferrer'
        fallbackLink.style.display = 'none'
        document.body.appendChild(fallbackLink)
        fallbackLink.click()
        
        setTimeout(() => {
          if (fallbackLink.parentNode) {
            document.body.removeChild(fallbackLink)
          }
        }, 1000)
      }
    } catch (windowError) {
      console.warn('Fallback window open failed:', windowError)
    }
  }, 300) // Small delay to let download attempt first
  
  // Clean up
  setTimeout(() => {
    if (link.parentNode) {
      document.body.removeChild(link)
    }
    URL.revokeObjectURL(url)
  }, 2000) // Longer delay for mobile to ensure both methods have time
}

interface ComparisonData {
  yourRankingName: string | null
  theirRankingName: string | null
  yourDisplayName: string
  theirDisplayName: string
  similarity: number
  sharedSongs: Array<{
    song: RankedSong
    yourRank: number
    theirRank: number
    indicator: 'up' | 'down' | 'same'
    diffAmount: number
  }>
  onlyInYourList: RankedSong[]
  onlyInTheirList: RankedSong[]
  created_at: string
}

export async function generateComparisonImage(comparison: ComparisonData): Promise<void> {
  // Check if we're on mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  
  // Canvas dimensions (wider for side-by-side comparison)
  const width = 768 // Double width for side-by-side
  const padding = 20
  const contentWidth = width - (padding * 2)
  const columnGap = 20
  const columnWidth = (contentWidth - columnGap) / 2
  const leftColumnX = padding
  const rightColumnX = padding + columnWidth + columnGap
  
  // Create canvas
  const canvas = document.createElement('canvas')
  const scale = isMobile ? 1.5 : 2
  canvas.width = width * scale
  canvas.height = 3000 * scale // Start with large height, will trim later
  const ctx = canvas.getContext('2d')
  
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Scale context
  ctx.scale(scale, scale)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, 3000)

  let y = padding + 35

  // Header
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'center'
  ctx.font = 'bold 24px monospace'
  ctx.fillText('RANKIFY', width / 2, y)
  y += 30

  ctx.font = '12px monospace'
  ctx.fillStyle = '#666666'
  ctx.fillText('COMPARISON', width / 2, y)
  y += 20

  // Similarity score
  ctx.font = 'bold 14px monospace'
  ctx.fillStyle = '#000000'
  ctx.fillText(`${comparison.similarity}% SIMILARITY`, width / 2, y)
  y += 20

  // Date
  const date = new Date(comparison.created_at)
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  ctx.font = '10px monospace'
  ctx.fillStyle = '#999999'
  ctx.fillText(formattedDate.toUpperCase(), width / 2, y)
  y += 20

  // Divider
  ctx.strokeStyle = '#000000'
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(padding, y)
  ctx.lineTo(width - padding, y)
  ctx.stroke()
  ctx.setLineDash([])
  y += 20

  // Column headers
  ctx.textAlign = 'left'
  const headerY = y
  
  // Left column header
  ctx.font = 'bold 11px monospace'
  ctx.fillStyle = '#000000'
  const yourRankingName = (comparison.yourRankingName || 'YOUR RANKING').toUpperCase()
  ctx.fillText(yourRankingName, leftColumnX, headerY)
  
  ctx.font = '10px monospace'
  ctx.fillStyle = '#666666'
  const yourUserName = comparison.yourDisplayName.toUpperCase()
  ctx.fillText(`BY ${yourUserName}`, leftColumnX, headerY + 12)
  
  // Right column header
  ctx.font = 'bold 11px monospace'
  ctx.fillStyle = '#000000'
  const theirRankingName = (comparison.theirRankingName || 'THEIR RANKING').toUpperCase()
  ctx.fillText(theirRankingName, rightColumnX, headerY)
  
  ctx.font = '10px monospace'
  ctx.fillStyle = '#666666'
  const theirUserName = comparison.theirDisplayName.toUpperCase()
  ctx.fillText(`BY ${theirUserName}`, rightColumnX, headerY + 12)
  
  // Move y down after both headers with spacing
  y = headerY + 35

  // Sort shared songs to match web app logic:
  // Left column: sorted by yourRank (YOUR order, numbered 1-N)
  // Right column: sorted by theirRank (THEIR order, numbered 1-N)
  const yourSharedSongs = [...comparison.sharedSongs].sort((a, b) => a.yourRank - b.yourRank)
  const theirSharedSongs = [...comparison.sharedSongs].sort((a, b) => a.theirRank - b.theirRank)

  // Create a map for indicators
  const indicatorMap = new Map<string, typeof comparison.sharedSongs[0]>()
  comparison.sharedSongs.forEach(item => {
    const songId = item.song.musicbrainz_id || `${item.song.title}|${item.song.artist}`
    indicatorMap.set(songId, item)
  })

  // Shared songs - side by side
  // Each column is independent - left shows YOUR order, right shows THEIR order
  ctx.font = '11px monospace'
  ctx.fillStyle = '#000000' // Ensure black color at start
  
  // Find the maximum length to know how many rows we need
  const maxLength = Math.max(yourSharedSongs.length, theirSharedSongs.length)
  
  // Draw both columns independently, row by row
  for (let i = 0; i < maxLength; i++) {
    const currentY = y
    let leftY = currentY
    let rightY = currentY
    
    // Left column - YOUR ranking order
    if (i < yourSharedSongs.length) {
      const yourItem = yourSharedSongs[i]
      const song = yourItem.song
      const songText = `${song.title.toUpperCase()} - ${song.artist.toUpperCase()}`
      
      // Left column - your ranking (numbered 1-N sequentially)
      const yourRank = String(i + 1).padStart(2, '0')
      ctx.font = 'bold 11px monospace'
      ctx.fillStyle = '#000000'
      ctx.fillText(yourRank, leftColumnX, currentY)
      
      ctx.font = '11px monospace'
      ctx.fillStyle = '#000000'
      const leftTextX = leftColumnX + 30
      const maxLeftTextWidth = columnWidth - 30
      
      const leftMetrics = ctx.measureText(songText)
      if (leftMetrics.width > maxLeftTextWidth) {
        leftY = wrapText(ctx, songText, leftTextX, currentY, maxLeftTextWidth, 14)
      } else {
        ctx.fillText(songText, leftTextX, currentY)
        leftY = currentY + 14
      }
    }
    
    // Right column - THEIR ranking order
    if (i < theirSharedSongs.length) {
      const theirItem = theirSharedSongs[i]
      const song = theirItem.song
      const songText = `${song.title.toUpperCase()} - ${song.artist.toUpperCase()}`
      
      // Right column - their ranking (numbered 1-N sequentially)
      const theirRank = String(i + 1).padStart(2, '0')
      ctx.font = 'bold 11px monospace'
      ctx.fillStyle = '#000000'
      ctx.fillText(theirRank, rightColumnX, currentY)
      
      // Get indicator for this song
      const songId = song.musicbrainz_id || `${song.title}|${song.artist}`
      const indicatorItem = indicatorMap.get(songId) || theirItem
      
      let indicatorText = ''
      if (indicatorItem.indicator === 'up') {
        indicatorText = `↑${indicatorItem.diffAmount}`
        ctx.fillStyle = '#00aa00'
      } else if (indicatorItem.indicator === 'down') {
        indicatorText = `↓${indicatorItem.diffAmount}`
        ctx.fillStyle = '#aa0000'
      } else {
        indicatorText = '='
        ctx.fillStyle = '#666666'
      }
      
      const indicatorX = rightColumnX + columnWidth - 30
      ctx.font = 'bold 11px monospace'
      ctx.fillText(indicatorText, indicatorX, currentY)
      
      ctx.font = '11px monospace'
      ctx.fillStyle = '#000000'
      const rightTextX = rightColumnX + 30
      const maxRightTextWidth = columnWidth - 60 // Account for indicator
      
      const rightMetrics = ctx.measureText(songText)
      if (rightMetrics.width > maxRightTextWidth) {
        rightY = wrapText(ctx, songText, rightTextX, currentY, maxRightTextWidth, 14)
      } else {
        ctx.fillText(songText, rightTextX, currentY)
        rightY = currentY + 14
      }
    }
    
    // Move to next line based on whichever column needed more space
    y = Math.max(leftY, rightY) + 2
  }

  y += 10

  // Divider
  ctx.strokeStyle = '#000000'
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(padding, y)
  ctx.lineTo(width - padding, y)
  ctx.stroke()
  ctx.setLineDash([])
  y += 20

  // Unique songs sections
  if (comparison.onlyInYourList.length > 0 || comparison.onlyInTheirList.length > 0) {
    ctx.font = 'bold 11px monospace'
    ctx.fillStyle = '#000000'
    ctx.textAlign = 'center'
    ctx.fillText('UNIQUE SONGS', width / 2, y)
    y += 15

    const maxUnique = Math.max(comparison.onlyInYourList.length, comparison.onlyInTheirList.length)
    
    for (let i = 0; i < maxUnique; i++) {
      const currentY = y
      let leftY = currentY
      let rightY = currentY
      
      // Left column - only in your list
      if (i < comparison.onlyInYourList.length) {
        const song = comparison.onlyInYourList[i]
        ctx.textAlign = 'left'
        ctx.font = '11px monospace'
        ctx.fillStyle = '#ff8800'
        ctx.fillText('*', leftColumnX, currentY)
        
        const songText = `${song.title.toUpperCase()} - ${song.artist.toUpperCase()}`
        ctx.fillStyle = '#000000'
        const textX = leftColumnX + 15
        const maxTextWidth = columnWidth - 15
        
        const metrics = ctx.measureText(songText)
        if (metrics.width > maxTextWidth) {
          leftY = wrapText(ctx, songText, textX, currentY, maxTextWidth, 14)
        } else {
          ctx.fillText(songText, textX, currentY)
          leftY = currentY + 14
        }
      }

      // Right column - only in their list
      if (i < comparison.onlyInTheirList.length) {
        const song = comparison.onlyInTheirList[i]
        ctx.textAlign = 'left'
        ctx.font = '11px monospace'
        ctx.fillStyle = '#ff8800'
        ctx.fillText('*', rightColumnX, currentY)
        
        const songText = `${song.title.toUpperCase()} - ${song.artist.toUpperCase()}`
        ctx.fillStyle = '#000000'
        const textX = rightColumnX + 15
        const maxTextWidth = columnWidth - 15
        
        const metrics = ctx.measureText(songText)
        if (metrics.width > maxTextWidth) {
          rightY = wrapText(ctx, songText, textX, currentY, maxTextWidth, 14)
        } else {
          ctx.fillText(songText, textX, currentY)
          rightY = currentY + 14
        }
      }
      
      // Move to next line based on whichever column needed more space
      y = Math.max(leftY, rightY) + 2
    }

    y += 10
  }

  // Divider
  ctx.strokeStyle = '#000000'
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(padding, y)
  ctx.lineTo(width - padding, y)
  ctx.stroke()
  ctx.setLineDash([])
  y += 20

  // Footer
  ctx.textAlign = 'center'
  ctx.font = 'bold 10px monospace'
  ctx.fillStyle = '#000000'
  ctx.fillText('RANK YOUR MUSIC WITH PRECISION', width / 2, y)
  y += 15

  ctx.font = '10px monospace'
  ctx.fillStyle = '#999999'
  ctx.fillText('rankify-music.vercel.app', width / 2, y)

  // Trim canvas to actual content height
  const actualHeight = Math.ceil(y + padding + 35)
  const trimmedCanvas = document.createElement('canvas')
  trimmedCanvas.width = width * scale
  trimmedCanvas.height = actualHeight * scale
  const trimmedCtx = trimmedCanvas.getContext('2d')
  
  if (!trimmedCtx) {
    throw new Error('Failed to get trimmed canvas context')
  }

  trimmedCtx.drawImage(canvas, 0, 0, width * scale, actualHeight * scale, 0, 0, width * scale, actualHeight * scale)

  // Convert to blob
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    try {
      trimmedCanvas.toBlob(
        (blob) => {
          resolve(blob)
        },
        'image/png',
        0.95
      )
      setTimeout(() => {
        reject(new Error('Blob conversion timed out'))
      }, 5000)
    } catch (error) {
      reject(error)
    }
  })

  if (!blob) {
    throw new Error('Failed to create image blob')
  }

  const fileName = `comparison_${(comparison.yourRankingName || 'your').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_vs_${(comparison.theirRankingName || 'their').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`
  const url = URL.createObjectURL(blob)

  // Strategy 1: Try Share API on mobile
  const shareSupported = 'share' in navigator && 'canShare' in navigator
  if (isMobile && shareSupported) {
    try {
      const file = new File([blob], fileName, {
        type: 'image/png',
      })
      
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Ranking Comparison',
        })
        URL.revokeObjectURL(url)
        return
      }
    } catch (shareError: any) {
      if (shareError.name === 'AbortError') {
        URL.revokeObjectURL(url)
        return
      }
      console.warn('Share API failed, falling back to download:', shareError)
    }
  }

  // Strategy 2: Desktop - use download link
  if (!isMobile) {
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.style.display = 'none'
    
    document.body.appendChild(link)
    
    await new Promise(resolve => setTimeout(resolve, 50))
    
    link.click()
    
    setTimeout(() => {
      if (link.parentNode) {
        document.body.removeChild(link)
      }
      URL.revokeObjectURL(url)
    }, 1000)
    return
  }

  // Strategy 3: Mobile - try download link, with fallback
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  
  document.body.appendChild(link)
  await new Promise(resolve => setTimeout(resolve, 50))
  link.click()
  
  setTimeout(() => {
    try {
      const newWindow = window.open(url, '_blank')
      
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        const fallbackLink = document.createElement('a')
        fallbackLink.href = url
        fallbackLink.target = '_blank'
        fallbackLink.rel = 'noopener noreferrer'
        fallbackLink.style.display = 'none'
        document.body.appendChild(fallbackLink)
        fallbackLink.click()
        
        setTimeout(() => {
          if (fallbackLink.parentNode) {
            document.body.removeChild(fallbackLink)
          }
        }, 1000)
      }
    } catch (windowError) {
      console.warn('Fallback window open failed:', windowError)
    }
  }, 300)
  
  setTimeout(() => {
    if (link.parentNode) {
      document.body.removeChild(link)
    }
    URL.revokeObjectURL(url)
  }, 2000)
}

