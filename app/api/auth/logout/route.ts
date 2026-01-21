import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Mark this route as dynamic since it uses cookies for authentication
export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', new URL('/', 'http://localhost:3000')))
}

