import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 60

const CARE_KEYS = ['水耐性','汗耐性','海水耐性','シャワー使用','プール使用','温泉使用','香水・化粧品','日常のお手入れ','保管方法','石の特徴','石のお手入れ']

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY || process.env.OPNEAI_API_KEY
  if (!key) throw new Error('OpenAI API key not configured')
  return new OpenAI({ apiKey: key })
}

export async function POST(request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const { specs = [], productName = '', productType = '', color = '' } = body || {}

  // Build material context from specs
  const materialContext = specs
    .filter(s => s.spec_key && s.spec_value)
    .map(s => `${s.spec_key}: ${s.spec_value}`)
    .join('\n')

  if (!materialContext && !productName) {
    return NextResponse.json({ error: '素材・スペック情報を先に入力してください' }, { status: 400 })
  }

  const prompt = `You are a care information writer for CIELO, a Japanese luxury accessories brand.

Based on the following product information, generate care instructions in Japanese.
Write in quiet, concise CIELO brand voice. No bullet points. No warnings. No symbols.
Each value: 1-3 natural sentences. If insufficient info for a specific field, write a general safe recommendation.

Product: ${productName || productType || 'Accessory'}
${color ? `Color: ${color}` : ''}
${materialContext ? `Materials:\n${materialContext}` : ''}

Return ONLY a JSON object with these exact keys (Japanese):
{
  "水耐性": "...",
  "汗耐性": "...",
  "海水耐性": "...",
  "シャワー使用": "...",
  "プール使用": "...",
  "温泉使用": "...",
  "香水・化粧品": "...",
  "日常のお手入れ": "...",
  "保管方法": "...",
  "石の特徴": "...",
  "石のお手入れ": "..."
}

No markdown. No explanation. JSON only.`

  let care
  try {
    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model:           'gpt-4o',
      response_format: { type: 'json_object' },
      temperature:     0.2,
      max_tokens:      1500,
      messages: [{ role: 'user', content: prompt }],
    })
    care = JSON.parse(completion.choices[0]?.message?.content || '{}')
  } catch (e) {
    console.error('[CIELO CARE] OpenAI error:', e.message)
    return NextResponse.json({ error: '生成に失敗しました。再度お試しください。' }, { status: 502 })
  }

  // Sanitize
  const result = {}
  for (const k of CARE_KEYS) {
    if (typeof care[k] === 'string' && care[k].trim()) {
      result[k] = care[k].trim().slice(0, 500)
    }
  }

  return NextResponse.json({ care: result })
}
