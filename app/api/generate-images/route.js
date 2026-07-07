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

/* ── Gallery shots (4 images → slots 2-5) ── */
const GALLERY_SHOTS = [
  {
    id: 'gallery_male_full',
    prompt: (name, type, color) =>
      `Editorial fashion photo. A stylish Japanese male model wearing this exact ${color} ${type}. Full upper body. Cinematic dark studio lighting. Luxury brand lookbook. Do not alter the product.`,
  },
  {
    id: 'gallery_female_full',
    prompt: (name, type, color) =>
      `Editorial fashion photo. A stylish Japanese female model wearing this exact ${color} ${type}. Full upper body. Cinematic dark studio lighting. Luxury brand lookbook. Do not alter the product.`,
  },
  {
    id: 'gallery_female_closeup',
    prompt: (name, type, color) =>
      `Close-up editorial. This exact ${color} ${type} worn on a female model. Shallow depth of field, dramatic side lighting, dark background. Luxury fashion editorial. Product unchanged.`,
  },
  {
    id: 'gallery_urban_male',
    prompt: (name, type, color) =>
      `Street luxury editorial. A male model wearing this exact ${color} ${type}, Tokyo night scene, neon ambient light. Cinematic, atmospheric. Product unchanged.`,
  },
]

/* ── Thumbnail candidates (5 images → user picks 1 → slot 1) ── */
const THUMBNAIL_SHOTS = [
  {
    id: 'thumb_studio_male',
    prompt: (name, type, color) =>
      `Product thumbnail photo. Japanese male model wearing this exact ${color} ${type}, centered composition, clean dark studio background. Sharp, clear, works at small size. Luxury brand card image.`,
  },
  {
    id: 'thumb_studio_female',
    prompt: (name, type, color) =>
      `Product thumbnail photo. Japanese female model wearing this exact ${color} ${type}, centered composition, clean dark studio background. Sharp, clear, works at small size. Luxury brand card image.`,
  },
  {
    id: 'thumb_closeup_product',
    prompt: (name, type, color) =>
      `Product thumbnail. This exact ${color} ${type} shown clearly against pure dark background. High contrast, sharp detail, no motion blur. Perfect for product grid thumbnail. No human.`,
  },
  {
    id: 'thumb_editorial_female',
    prompt: (name, type, color) =>
      `Editorial thumbnail. Japanese female model, this exact ${color} ${type} clearly visible, moody cinematic portrait. Clean enough to read at thumbnail size. Luxury fashion.`,
  },
  {
    id: 'thumb_editorial_male',
    prompt: (name, type, color) =>
      `Editorial thumbnail. Japanese male model, this exact ${color} ${type} clearly visible, street luxury portrait style. Clean enough to read at thumbnail size. Tokyo aesthetic.`,
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

  // Generate gallery (4) + thumbnails (5) in parallel — 9 total
  const allShots = [
    ...GALLERY_SHOTS.map(s => ({ ...s, role: 'gallery' })),
    ...THUMBNAIL_SHOTS.map(s => ({ ...s, role: 'thumbnail' })),
  ]

  const results = await Promise.allSettled(
    allShots.map(async (shot) => {
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
      return { id: shot.id, role: shot.role, b64 }
    })
  )

  const gallery    = []
  const thumbnails = []
  const errors     = []

  for (const r of results) {
    if (r.status === 'fulfilled') {
      if (r.value.role === 'gallery') gallery.push(r.value)
      else thumbnails.push(r.value)
    } else {
      console.error('[CIELO IMG] Shot error:', r.reason?.message)
      errors.push(r.reason?.message?.slice(0, 120) || 'unknown')
    }
  }

  if (gallery.length === 0 && thumbnails.length === 0) {
    return NextResponse.json({ error: `画像生成に失敗しました: ${errors[0] || 'unknown'}` }, { status: 502 })
  }

  return NextResponse.json({ gallery, thumbnails, errors: errors.length ? errors : undefined })
}
