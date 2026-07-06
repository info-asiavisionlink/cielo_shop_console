import { createAdminClient } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// Vercel serverless timeout budget
export const maxDuration = 60

const TEXT_THRESHOLD = 100 // chars — below this, treat as image-based PDF

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY || process.env.OPNEAI_API_KEY
  if (!key) throw new Error('OpenAI API key not configured')
  return new OpenAI({ apiKey: key })
}

/* ── Prompts ─────────────────────────────────────────────── */
const SYSTEM_PROMPT = `You are a product data extraction system for CIELO, a Japanese luxury brand.
Your task: extract structured product data from supplier product information.

EXTRACTION RULES:
- Extract ONLY facts clearly stated in the document or visible in the image
- Never invent materials, dimensions, weight, country of origin, or gemstone types
- Never confuse Moissanite with CZ (Cubic Zirconia) — they are different materials
- Never confuse Gold Plated with Solid Gold
- Return null for any unknown or unverifiable information
- Country of origin: only include if explicitly stated
- If multiple colors appear, do NOT choose one — leave color blank
- Do NOT include: supplier ratings, MOQ, discounts, shipping prices, marketplace promotional text
- Ignore: related product cards, reviews, recommended items, seller badges

CIELO BRAND COPY RULES:
- Generate original English/Japanese product copy — do not translate supplier text verbatim
- Voice: silent luxury, timeless, spatial, ownership
- Forbidden words: cheap, bargain, wholesale, dropshipping, cost-effective, best seller, trending, hot, bling
- Focus on: materials, craftsmanship, wearable impression, personal ownership
- Description: 2–4 sentences max

Return valid JSON only. Use null for unknown fields. Do not add markdown fences.`

const USER_PROMPT = `Analyze this product and return a JSON object with these exact fields:

{
  "name": "English product name (clean, luxury brand tone, no marketplace keywords)",
  "name_ja": "Japanese product name or null",
  "slug_suggestion": "url-safe lowercase slug, e.g. cielo-tennis-bracelet",
  "category": "jewelry" or "apparel" or "art" or null,
  "description": "2-4 sentences in CIELO brand voice (English)",
  "description_ja": "Japanese version or null",
  "story": "1 short brand tagline in English or null",
  "story_ja": "Japanese tagline or null",
  "seo_title": "SEO title under 70 chars or null",
  "seo_description": "SEO description under 150 chars or null",
  "tags": ["array of tag strings, max 10"],
  "specs": [{"label": "Material", "value": "Brass"}, {"label": "Stone", "value": "Cubic Zirconia"}, ...],
  "variant_suggestions": [{"type": "length", "options": ["18cm", "20cm"]}],
  "review_required": ["list field names that need human review, e.g. country_of_origin"]
}

specs should include all clearly verifiable product attributes (material, stone, plating, dimensions, weight, finish, etc.).
Do NOT include price, MOQ, or marketplace data in specs.`

/* ── Path A: Text PDF → Chat Completions ─────────────────── */
async function analyzeWithText(openai, pdfText) {
  const completion = await openai.chat.completions.create({
    model:           'gpt-4o',
    response_format: { type: 'json_object' },
    temperature:     0.1,
    max_tokens:      2500,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: `${USER_PROMPT}\n\n--- PRODUCT PDF CONTENT ---\n${pdfText.slice(0, 14000)}` }
    ]
  })
  return JSON.parse(completion.choices[0]?.message?.content || '{}')
}

/* ── Path B: Image PDF → Files API + Responses API ────────── */
async function analyzeWithVision(openai, buffer) {
  // Upload to OpenAI Files API (purpose: user_data for Responses API)
  const uploaded = await openai.files.create({
    file:    new File([buffer], 'product.pdf', { type: 'application/pdf' }),
    purpose: 'user_data',
  })

  try {
    const response = await openai.responses.create({
      model: 'gpt-4o',
      input: [{
        role:    'user',
        content: [
          {
            type: 'input_text',
            text: `${SYSTEM_PROMPT}\n\n${USER_PROMPT}`,
          },
          {
            type:    'input_file',
            file_id: uploaded.id,
          },
        ],
      }],
      text: { format: { type: 'json_object' } },
    })

    return JSON.parse(response.output_text || '{}')
  } finally {
    // Always clean up the uploaded file
    openai.files.del(uploaded.id).catch(e =>
      console.error('[CIELO AI] OpenAI file cleanup error:', e.message)
    )
  }
}

/* ── Sanitize AI response ────────────────────────────────── */
function sanitize(draft) {
  const slug = typeof draft.slug_suggestion === 'string'
    ? draft.slug_suggestion.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
    : null

  return {
    name:            typeof draft.name === 'string'            ? draft.name.slice(0, 200)            : null,
    name_ja:         typeof draft.name_ja === 'string'         ? draft.name_ja.slice(0, 200)         : null,
    slug_suggestion: slug,
    category:        ['jewelry', 'apparel', 'art'].includes(draft.category) ? draft.category         : null,
    description:     typeof draft.description === 'string'     ? draft.description.slice(0, 1200)    : null,
    description_ja:  typeof draft.description_ja === 'string'  ? draft.description_ja.slice(0, 1200) : null,
    story:           typeof draft.story === 'string'           ? draft.story.slice(0, 300)           : null,
    story_ja:        typeof draft.story_ja === 'string'        ? draft.story_ja.slice(0, 300)        : null,
    seo_title:       typeof draft.seo_title === 'string'       ? draft.seo_title.slice(0, 120)       : null,
    seo_description: typeof draft.seo_description === 'string' ? draft.seo_description.slice(0, 300) : null,
    tags: Array.isArray(draft.tags)
      ? draft.tags.filter(t => typeof t === 'string' && t.trim()).slice(0, 12).map(t => t.slice(0, 60))
      : [],
    specs: Array.isArray(draft.specs)
      ? draft.specs.filter(s => s?.label && s?.value).slice(0, 30)
          .map(s => ({ label: String(s.label).slice(0, 100), value: String(s.value).slice(0, 300) }))
      : [],
    variant_suggestions: Array.isArray(draft.variant_suggestions)
      ? draft.variant_suggestions.filter(v => v?.type && Array.isArray(v?.options)).slice(0, 5)
      : [],
    review_required: Array.isArray(draft.review_required)
      ? draft.review_required.filter(f => typeof f === 'string').slice(0, 20)
      : [],
  }
}

/* ── Route handler ───────────────────────────────────────── */
export async function POST(request) {
  // Auth
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Body: { path: "pdf-temp/xxx.pdf" }
  let body
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const { path } = body || {}
  if (!path || typeof path !== 'string' || !path.startsWith('pdf-temp/')) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
  }

  // Download from Supabase Storage
  const admin = createAdminClient()
  const { data: fileBlob, error: downloadError } = await admin.storage
    .from('product-images')
    .download(path)

  if (downloadError || !fileBlob) {
    console.error('[CIELO AI] Storage download error:', downloadError?.message)
    return NextResponse.json({ error: 'ファイルが見つかりません。再度アップロードしてください。' }, { status: 404 })
  }

  const buffer = Buffer.from(await fileBlob.arrayBuffer())

  // Delete temp file (async, non-blocking)
  admin.storage.from('product-images').remove([path]).catch(e =>
    console.error('[CIELO AI] Storage cleanup error:', e.message)
  )

  // Step 1: Attempt text extraction
  let pdfText = ''
  try {
    const pdfParse = (await import('pdf-parse')).default
    const data     = await pdfParse(buffer)
    pdfText        = (data.text || '').replace(/\s+/g, ' ').trim()
  } catch (e) {
    console.warn('[CIELO AI] pdf-parse failed, falling back to vision:', e.message)
  }

  const hasText = pdfText.length >= TEXT_THRESHOLD
  console.log(`[CIELO AI] PDF path=${path} textLen=${pdfText.length} mode=${hasText ? 'text' : 'vision'}`)

  // Step 2: AI analysis
  let draft
  try {
    const openai = getOpenAI()
    if (hasText) {
      draft = await analyzeWithText(openai, pdfText)
    } else {
      draft = await analyzeWithVision(openai, buffer)
    }
  } catch (e) {
    console.error('[CIELO AI] OpenAI error:', e.message, e.status)
    if (e.status === 401) return NextResponse.json({ error: 'OpenAI API設定を確認してください。' }, { status: 502 })
    if (e.status === 429) return NextResponse.json({ error: 'しばらくしてから再試行してください（レート制限）。' }, { status: 429 })
    return NextResponse.json({ error: '商品の解析に失敗しました。PDFを確認して、もう一度実行してください。' }, { status: 502 })
  }

  return NextResponse.json({ draft: sanitize(draft), mode: hasText ? 'text' : 'vision' })
}
