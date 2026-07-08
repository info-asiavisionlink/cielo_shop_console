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

Based on the following product information, generate practical, gentle care instructions in Japanese.

TONE RULES — strictly follow these:
- Write as if talking to an adult who wears jewelry daily. Assume they are reasonable.
- Do NOT use strong prohibitions like 「避けてください」「お控えください」「推奨しておりません」
- Instead use soft guidance: 「〜後は拭き取るだけで問題ありません」「〜の場合は軽くすすいでください」
- Acknowledge that daily life contact (light water, sweat) is fine with simple care
- Keep each value to 1-2 short sentences. Friendly, not alarming.
- No bullet points. No symbols. No "×". Just natural Japanese sentences.

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

Example tone (for brass + gold plating + CZ):
- 水耐性: "軽い水濡れは問題ありません。着用後は柔らかな布で軽く拭くだけで十分です。"
- 汗耐性: "日常的な着用には問題ありません。スポーツ後など汗をかいた場合は、乾いた布で拭き取ってください。"
- 海水耐性: "海水に触れた後は、真水で軽くすすいで乾かしてください。"
- シャワー使用: "シャワーを浴びたまま着用しても問題ありませんが、石鹸が付いた場合は水で流してください。"
- プール使用: "プールの塩素は長時間の浸漬でメッキに影響が出る場合があります。使用後は水で流してください。"
- 温泉使用: "温泉成分（硫黄など）が付着した場合は、早めに水で流してください。"

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
