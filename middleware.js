import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const PROTECTED = ['/dashboard', '/products', '/orders', '/shipping', '/customers']

export async function middleware(request) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED.some(p => pathname === p || pathname.startsWith(p + '/'))
  const isLoginPage = pathname === '/login'

  // 保護対象でもログインページでもない場合はそのまま通過
  if (!isProtected && !isLoginPage) {
    return NextResponse.next()
  }

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

  const cookieNames = request.cookies.getAll().map(c => c.name)
  console.log('[MIDDLEWARE] cookies received:', cookieNames.join(', ') || '(none)', 'path:', pathname)

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError) {
    console.log('[MIDDLEWARE] AUTH_ERROR:', authError.message, 'path:', pathname)
  }

  if (user) {
    console.log('[MIDDLEWARE] SESSION_FOUND user.id:', user.id, 'path:', pathname)
  } else {
    console.log('[MIDDLEWARE] SESSION_NOT_FOUND path:', pathname)
  }

  // 未ログイン → 保護ページへのアクセスを /login へリダイレクト
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ログイン済み → /login へのアクセスを /dashboard へリダイレクト
  if (user && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
