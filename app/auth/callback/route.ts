import { createServerClient } from '@supabase/ssr'
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
    // Build the redirect response first. Session cookies MUST be set on this
    // response — if we use createClient() from server and return a separate
    // NextResponse.redirect(), cookies set via cookies().set() are NOT sent.
    const redirectUrl = new URL(finalNext, requestUrl.origin)
    redirectUrl.searchParams.set('auth', 'success')
    const redirectResponse = NextResponse.redirect(redirectUrl)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              const sameSite = options?.sameSite === false
                ? undefined
                : (options?.sameSite as 'strict' | 'lax' | 'none' | undefined)
              redirectResponse.cookies.set(name, value, {
                ...options,
                sameSite,
              })
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      const loginUrl = new URL('/login', requestUrl.origin)
      loginUrl.searchParams.set('error', 'auth_failed')
      loginUrl.searchParams.set('details', error.message)
      return NextResponse.redirect(loginUrl)
    }

    // Clear the next-url cookie
    redirectResponse.cookies.set('sb-next-url', '', { path: '/', maxAge: 0 })

    return redirectResponse
  }

  // No code provided, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
