import { createAdminClient } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// [DEBUG ONLY] ブラウザのcookieとセッション状態を確認する
// 調査完了後に削除すること
export async function GET() {
  const cookieStore = cookies()
  const allCookies = cookieStore.getAll()

  const cookieNames = allCookies.map(c => c.name)
  const authCookies = allCookies.filter(c =>
    c.name.includes('supabase') || c.name.includes('sb-') || c.name.includes('auth')
  )

  // Service Role Key で直接ユーザー一覧取得（セッションとは無関係）
  let adminCheck = null
  try {
    const admin = createAdminClient()
    const { data } = await admin.auth.admin.listUsers({ perPage: 1 })
    adminCheck = { ok: true, userCount: data?.users?.length ?? 0 }
  } catch (e) {
    adminCheck = { ok: false, error: e.message }
  }

  return NextResponse.json({
    totalCookies: allCookies.length,
    cookieNames,
    authCookies: authCookies.map(c => ({ name: c.name, valuePrefix: c.value.slice(0, 40) + '...' })),
    adminCheck,
  })
}
