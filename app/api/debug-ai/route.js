import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const results = {}

  // 1. OpenAI key check
  const key = process.env.OPENAI_API_KEY || process.env.OPNEAI_API_KEY
  results.openai_key = key
    ? `SET (${key.slice(0, 10)}...${key.slice(-4)}, len=${key.length})`
    : 'NOT SET'

  // 2. Supabase admin check
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.storage.listBuckets()
    results.supabase_storage = error
      ? `ERROR: ${error.message}`
      : `OK — buckets: ${data.map(b => b.name).join(', ')}`
  } catch (e) {
    results.supabase_storage = `EXCEPTION: ${e.message}`
  }

  // 3. Supabase signed URL check
  try {
    const admin = createAdminClient()
    const testPath = `pdf-temp/debug-test-${Date.now()}.pdf`
    const { data, error } = await admin.storage
      .from('product-images')
      .createSignedUploadUrl(testPath)
    results.signed_url = error
      ? `ERROR: ${error.message}`
      : `OK — token=${data?.token?.slice(0, 20)}...`
  } catch (e) {
    results.signed_url = `EXCEPTION: ${e.message}`
  }

  // 4. OpenAI API test (minimal)
  if (key) {
    try {
      const openai = new OpenAI({ apiKey: key })
      const completion = await openai.chat.completions.create({
        model:      'gpt-4o',
        max_tokens: 5,
        messages:   [{ role: 'user', content: 'Say OK' }],
      })
      results.openai_api = `OK — response="${completion.choices[0]?.message?.content}"`
    } catch (e) {
      results.openai_api = `ERROR status=${e.status} message=${e.message}`
    }
  } else {
    results.openai_api = 'SKIPPED (no key)'
  }

  return NextResponse.json(results)
}
