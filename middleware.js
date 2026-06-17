import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isLoginPage = path === '/login'

  if (authError) {
    console.log('[MIDDLEWARE] AUTH_ERROR', authError.message, 'path:', path)
  }

  if (!user && !isLoginPage) {
    console.log('[MIDDLEWARE] NO_SESSION → redirect /login', 'path:', path)
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isLoginPage) {
    console.log('[MIDDLEWARE] ALREADY_LOGGED_IN → redirect /dashboard', 'user.id:', user.id)
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (user) {
    console.log('[MIDDLEWARE] AUTH_OK user.id:', user.id, 'path:', path)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
