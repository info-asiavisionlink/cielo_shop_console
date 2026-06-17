import { NextResponse } from 'next/server'

// [DEBUG] middleware completely disabled for login investigation
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
