import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  // 認証確認
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file')
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const buffer  = Buffer.from(await file.arrayBuffer())
  const ext     = file.name.split('.').pop().toLowerCase()
  const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif']
  if (!allowed.includes(ext)) {
    return NextResponse.json({ error: `Unsupported format: ${ext}` }, { status: 400 })
  }

  const path  = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const admin = createAdminClient()

  const { error: uploadError } = await admin.storage
    .from('product-images')
    .upload(path, buffer, { contentType: file.type, cacheControl: '31536000', upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data } = admin.storage.from('product-images').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl, path })
}
