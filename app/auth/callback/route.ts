import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/'

  if (code) {
    // IMPORTANT: Read cookies first to ensure they're loaded (Next.js 14 lazy evaluation)
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll() // Force cookies to be read
    
    // Log cookies for debugging (remove in production)
    console.log('Cookies available:', allCookies.map(c => c.name))
    
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        code: code.substring(0, 10) + '...',
      })
      // Redirect to login with error
      const loginUrl = new URL('/login', requestUrl.origin)
      loginUrl.searchParams.set('error', 'auth_failed')
      loginUrl.searchParams.set('details', error.message)
      return NextResponse.redirect(loginUrl)
    }

    console.log('Session exchanged successfully, user:', data.user?.email)

    // Verify the session was created
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error('Session created but no user found')
      const loginUrl = new URL('/login', requestUrl.origin)
      loginUrl.searchParams.set('error', 'session_failed')
      return NextResponse.redirect(loginUrl)
    }

    // Check if user's email is verified
    // For email/password signups, users need to verify before they can sign in
    // OAuth providers automatically verify emails
    if (!user.email_confirmed_at && user.app_metadata?.provider === 'email') {
      // Email not verified - sign them out and redirect to login
      await supabase.auth.signOut()
      const loginUrl = new URL('/login', requestUrl.origin)
      loginUrl.searchParams.set('error', 'email_not_verified')
      loginUrl.searchParams.set('details', 'Please verify your email before signing in. Check your inbox for the verification link.')
      return NextResponse.redirect(loginUrl)
    }

    // Check if this might be an email verification callback
    // If the user was just created (recent timestamp) and email is confirmed, it's likely verification
    const userCreatedRecently = user.created_at && 
      (Date.now() - new Date(user.created_at).getTime()) < 300000 // within last 5 minutes
    
    // If this appears to be an email verification (user just verified), redirect to login with success message
    // The login page will detect they're logged in and redirect to home, but show the message first
    if (userCreatedRecently && user.email_confirmed_at && user.app_metadata?.provider === 'email') {
      const loginUrl = new URL('/login', requestUrl.origin)
      loginUrl.searchParams.set('verified', 'true')
      return NextResponse.redirect(loginUrl)
    }
    
    // For OAuth or other flows, redirect to home page or intended destination
    // Add query params to indicate success
    const redirectUrl = new URL(next, requestUrl.origin)
    redirectUrl.searchParams.set('auth', 'success')
    const response = NextResponse.redirect(redirectUrl)
    
    // Ensure cookies are included in the response
    return response
  }

  // No code provided, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}

