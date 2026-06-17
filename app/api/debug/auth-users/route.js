import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

// [DEBUG ONLY] Service Role Key でAuth Users一覧を取得
// 調査完了後に削除すること
export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.auth.admin.listUsers()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const users = data.users.map(u => ({
      id:                 u.id,
      email:              u.email,
      email_confirmed_at: u.email_confirmed_at ?? null,
      created_at:         u.created_at,
      last_sign_in_at:    u.last_sign_in_at ?? null,
      confirmed:          !!u.email_confirmed_at,
    }))

    return NextResponse.json({
      project_id: process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/\/\/([^.]+)\./)?.[1] ?? 'unknown',
      count: users.length,
      users,
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
