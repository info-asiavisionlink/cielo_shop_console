import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

// [DEBUG ONLY] Service Role Key でユーザーを強制作成（email_confirm: true）
// 調査完了後に削除すること
export async function POST(request) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,  // メール確認をスキップして即時有効化
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      created: true,
      user: {
        id:                 data.user.id,
        email:              data.user.email,
        email_confirmed_at: data.user.email_confirmed_at,
        created_at:         data.user.created_at,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
