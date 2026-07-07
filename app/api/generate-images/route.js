import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 120

const MODEL = 'gpt-image-2'

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY || process.env.OPNEAI_API_KEY
  if (!key) throw new Error('OpenAI API key not configured')
  return new OpenAI({ apiKey: key })
}

/* ── 5 shot styles ── */
const SHOTS = [
  {
    id: 'worn_full',
    prompt: (name, type, color) =>
      `Editorial fashion photo. A stylish Japanese model wearing this exact ${color} ${type}. Full upper body shot. Cinematic dark studio lighting. Luxury brand lookbook style. Do not alter the product design.`,
  },
  {
    id: 'worn_closeup',
    prompt: (name, type, color) =>
      `Close-up editorial photo. This exact ${color} ${type} worn on a model. Extreme shallow depth of field, dramatic side lighting, dark background. Luxury jewelry editorial. Keep the product exactly as shown.`,
  },
  {
    id: 'worn_urban',
    prompt: (name, type, color) =>
      `Street luxury editorial. Model wearing this exact ${color} ${type}, Tokyo night scene, soft neon ambient light. Atmospheric, cinematic mood. The product must look identical to the reference.`,
  },
  {
    id: 'detail_surface',
    prompt: (name, type, color) =>
      `Macro detail photo of this exact ${color} ${type} on a dark matte surface. Dramatic raking light showing material texture and finish. No human. Product must look identical to reference image.`,
  },
  {
    id: 'worn_seated',
    prompt: (name, type, color) =>
      `Luxury brand editorial. Seated model wearing this exact ${color} ${type}, minimalist dark studio. Hands visible. Shot for high-fashion lookbook. Product must appear exactly as in reference.`,
  },
]

function buildPrompt(shot, productName, productType, category, color) {
  const type  = productType || (category === 'jewelry' ? 'accessory' : category === 'apparel' ? 'garment' : 'piece')
  const col   = color || 'silver'
  return (
    `CIELO brand, silent luxury, street luxury aesthetic. ${shot.prompt(productName, type, col)} ` +
    `Style: dark, cinematic, desaturated, high contrast. No price tags, no other brand logos, no text.`
  )
}

export async function POST(request) {
  // Auth
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Parse JSON body — imageUrl は Cloudinary で事前アップロード済み
  let body
  try {
    const rawText = await request.text()
    console.log('[CIELO IMG] raw body length:', rawText.length, 'preview:', rawText.slice(0, 200))
    if (!rawText || rawText.trim() === '') {
      return NextResponse.json({ error: 'リクエストボディが空です。再度試してください。' }, { status: 400 })
    }
    body = JSON.parse(rawText)
  } catch (e) {
    console.error('[CIELO IMG] JSON parse error:', e.message)
    return NextResponse.json({ error: `リクエスト解析エラー: ${e.message}` }, { status: 400 })
  }

  const { imageUrl, productName = '', productType = '', category = '', color = '' } = body || {}
  console.log('[CIELO IMG] imageUrl received:', imageUrl?.slice(0, 80))

  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('https://')) {
    return NextResponse.json({ error: `参照画像のURLが不正です (received: ${String(imageUrl).slice(0,50)})` }, { status: 400 })
  }

  let openai
  try { openai = getOpenAI() }
  catch (e) { return NextResponse.json({ error: e.message }, { status: 502 }) }

  // Cloudinary から参照画像をダウンロード（サーバー→サーバー、Vercel制限なし）
  let imageFile
  try {
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) throw new Error('参照画像のダウンロードに失敗しました')
    const buffer = Buffer.from(await imgRes.arrayBuffer())
    imageFile    = new File([buffer], 'product-reference.png', { type: 'image/png' })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 422 })
  }

  // Generate 5 shots in parallel using images.edit (image-to-image)
  const results = await Promise.allSettled(
    SHOTS.map(async (shot) => {
      const prompt = buildPrompt(shot, productName, productType, category, color)
      const response = await openai.images.edit({
        model:  MODEL,
        image:  imageFile,
        prompt,
        n:      1,
        size:   '1024x1024',
      })
      const b64 = response.data?.[0]?.b64_json
      if (!b64) throw new Error('No image data returned')
      return { id: shot.id, b64 }
    })
  )

  const images = []
  const errors = []
  for (const r of results) {
    if (r.status === 'fulfilled') images.push(r.value)
    else {
      console.error('[CIELO IMG] Shot error:', r.reason?.message)
      errors.push(r.reason?.message?.slice(0, 120) || 'unknown')
    }
  }

  if (images.length === 0) {
    return NextResponse.json({ error: `画像生成に失敗しました: ${errors[0] || 'unknown'}` }, { status: 502 })
  }

  return NextResponse.json({ images, errors: errors.length ? errors : undefined })
}
