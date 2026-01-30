import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  // Try to get 'next' from query param first, then from cookie
  let next = requestUrl.searchParams.get('next')

  if (!next) {
    next = request.cookies.get('sb-next-url')?.value ?? null
  }

  // Default to root if nothing found
  const finalNext = next || '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      const loginUrl = new URL('/login', requestUrl.origin)
      loginUrl.searchParams.set('error', 'auth_failed')
      loginUrl.searchParams.set('details', error.message)
      return NextResponse.redirect(loginUrl)
    }

    // Redirect to intended destination; add auth=success so client can refresh session (fixes first-load 401 after OAuth)
    const redirectUrl = new URL(finalNext, requestUrl.origin)
    redirectUrl.searchParams.set('auth', 'success')
    const finalResponse = NextResponse.redirect(redirectUrl)

    // Clear the next-url cookie
    finalResponse.cookies.set('sb-next-url', '', { path: '/', maxAge: 0 })

    return finalResponse
  }

  // No code provided, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
