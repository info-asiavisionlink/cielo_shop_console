'use client'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  console.log('SUPABASE_URL', url)
  console.log('ANON_EXISTS', !!anon)
  return createBrowserClient(url, anon)
}
