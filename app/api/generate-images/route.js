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

/* ── Product type → shot styles ─────────────────────────────
   Each entry is a different angle/scene for that product type.
   All shots are LIFESTYLE/EDITORIAL — never plain product-only.
──────────────────────────────────────────────────────────── */
const SHOT_STYLES = [
  {
    id: 'lifestyle_full',
    desc: (type, color) =>
      `Editorial lifestyle photo. A stylish Japanese model wearing a ${color} ${type}. Full upper body, cinematic lighting, dark moody background. Shot on medium format film. High-end luxury fashion editorial.`,
  },
  {
    id: 'closeup_worn',
    desc: (type, color) =>
      `Extreme close-up editorial photo. A ${color} ${type} worn on a model. Focus on the piece, shallow depth of field, bokeh background, dramatic side lighting. Luxury jewelry editorial.`,
  },
  {
    id: 'lifestyle_urban',
    desc: (type, color) =>
      `Street luxury editorial. Model wearing a ${color} ${type} in a dark urban environment, Tokyo night scene, soft neon reflections. Cinematic, atmospheric.`,
  },
  {
    id: 'detail_texture',
    desc: (type, color) =>
      `Macro detail shot of a ${color} ${type} against dark matte surface. Dramatic raking light revealing texture and material. No human. Pure material study. Luxury product editorial.`,
  },
  {
    id: 'lifestyle_seated',
    desc: (type, color) =>
      `Editorial fashion photo. Model seated, wearing a ${color} ${type}, hands visible, minimalist dark studio backdrop. Monochromatic palette. Shot for luxury brand lookbook.`,
  },
]

/* ── Jewelry/Apparel specific overrides ───────────────────── */
function buildPrompt(productName, productType, category, color, shot) {
  const typeLabel = productType || (category === 'jewelry' ? 'necklace' : category === 'apparel' ? 'T-shirt' : 'piece')
  const colorLabel = color || 'silver'
  const base = shot.desc(typeLabel, colorLabel)

  return (
    `CIELO brand, street luxury aesthetic, silent luxury. ${base} ` +
    `Brand: CIELO. Style: dark, cinematic, Tokyo, high fashion. ` +
    `Do NOT show price tags, logos of other brands, or text overlays. ` +
    `Product: ${productName}. ` +
    `Photography style: medium format, desaturated, high contrast shadows.`
  )
}

export async function POST(request) {
  // Auth
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const { productName, productType, category, color } = body || {}
  if (!productName && !productType) {
    return NextResponse.json({ error: '商品名または種別を入力してから生成してください' }, { status: 400 })
  }

  let openai
  try { openai = getOpenAI() }
  catch (e) { return NextResponse.json({ error: e.message }, { status: 502 }) }

  // Generate 5 images in parallel
  const results = await Promise.allSettled(
    SHOT_STYLES.map(async (shot) => {
      const prompt = buildPrompt(productName || productType, productType, category, color, shot)
      const response = await openai.images.generate({
        model:   MODEL,
        prompt,
        n:       1,
        size:    '1024x1024',
        quality: 'medium',
      })
      const b64 = response.data?.[0]?.b64_json
      if (!b64) throw new Error('No image data returned')
      return { id: shot.id, b64 }
    })
  )

  const images = []
  const errors = []

  for (const r of results) {
    if (r.status === 'fulfilled') {
      images.push(r.value)
    } else {
      console.error('[CIELO IMG] Generation error:', r.reason?.message)
      errors.push(r.reason?.message?.slice(0, 100) || 'unknown')
    }
  }

  if (images.length === 0) {
    return NextResponse.json({ error: '画像の生成に失敗しました。再度お試しください。' }, { status: 502 })
  }

  return NextResponse.json({ images, errors: errors.length ? errors : undefined })
}
