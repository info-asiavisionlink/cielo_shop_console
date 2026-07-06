import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const MAX_PDF_BYTES = 10 * 1024 * 1024 // 10 MB

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY || process.env.OPNEAI_API_KEY
  if (!key) throw new Error('OpenAI API key not configured')
  return new OpenAI({ apiKey: key })
}

const SYSTEM_PROMPT = `You are a product data extraction system for CIELO, a Japanese luxury brand.
Your task: extract structured product data from supplier PDF content.

EXTRACTION RULES:
- Extract ONLY facts clearly stated in the document
- Never invent materials, dimensions, weight, country of origin, or gemstone types
- Never confuse Moissanite with CZ (Cubic Zirconia) — they are different materials
- Never confuse Gold Plated with Solid Gold
- Return null for any unknown or unverifiable information
- Country of origin: only include if explicitly stated
- If multiple colors appear, do NOT choose one — leave color blank
- Do NOT include: supplier ratings, MOQ, discounts, shipping prices, marketplace text

CIELO BRAND COPY RULES:
- Generate original English/Japanese product copy — do not translate supplier text
- Voice: silent luxury, timeless, spatial, ownership
- Forbidden words: cheap, bargain, wholesale, dropshipping, cost-effective, best seller, trending, hot, bling, blingy
- Focus on: materials, craftsmanship, wearable impression, personal ownership
- Description: 2–4 sentences max

Return valid JSON only. Use null for unknown fields. Do not add markdown.`

const USER_PROMPT = `Analyze this product information and return a JSON object with these exact fields:

{
  "name": "English product name (clean, no marketplace keywords)",
  "name_ja": "Japanese product name or null",
  "slug_suggestion": "url-safe lowercase slug",
  "category": "jewelry" or "apparel" or "art" or null,
  "description": "2-4 sentences in CIELO brand voice (English)",
  "description_ja": "Japanese version or null",
  "story": "1 short brand tagline in English or null",
  "story_ja": "Japanese tagline or null",
  "seo_title": "SEO title under 70 chars or null",
  "seo_description": "SEO description under 150 chars or null",
  "tags": ["array", "of", "tag", "strings"],
  "specs": [{"label": "Material", "value": "Brass"}, ...],
  "variant_suggestions": [{"type": "length", "options": ["18cm", "20cm"]}],
  "review_required": ["fields that need human review, e.g. country_of_origin"]
}`

export async function POST(request) {
  // Auth check
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Parse form
  let formData
  try { formData = await request.formData() }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const file = formData.get('file')
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // Validate type
  const isPDF = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf')
  if (!isPDF) return NextResponse.json({ error: 'PDF files only' }, { status: 400 })

  // Validate size
  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.byteLength > MAX_PDF_BYTES) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
  }

  // Extract text from PDF
  let pdfText = ''
  try {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    pdfText = (data.text || '').trim()
  } catch (e) {
    console.error('[CIELO AI] PDF parse error:', e.message)
    return NextResponse.json({ error: 'Could not read PDF content. Try a different PDF.' }, { status: 422 })
  }

  if (!pdfText || pdfText.length < 30) {
    return NextResponse.json({ error: 'PDF appears to contain no readable text (image-only PDF).' }, { status: 422 })
  }

  // Call OpenAI
  let draft
  try {
    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 2500,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `${USER_PROMPT}\n\n--- PDF CONTENT START ---\n${pdfText.slice(0, 14000)}\n--- PDF CONTENT END ---`
        }
      ]
    })
    draft = JSON.parse(completion.choices[0]?.message?.content || '{}')
  } catch (e) {
    console.error('[CIELO AI] OpenAI error:', e.message)
    if (e.status === 401) return NextResponse.json({ error: 'OpenAI API key invalid' }, { status: 502 })
    if (e.status === 429) return NextResponse.json({ error: 'OpenAI rate limit exceeded. Try again later.' }, { status: 429 })
    return NextResponse.json({ error: 'AI analysis failed. Please try again.' }, { status: 502 })
  }

  // Sanitize — never trust AI output directly
  const slug = typeof draft.slug_suggestion === 'string'
    ? draft.slug_suggestion.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
    : null

  const sanitized = {
    name:             typeof draft.name === 'string'             ? draft.name.slice(0, 200)             : null,
    name_ja:          typeof draft.name_ja === 'string'          ? draft.name_ja.slice(0, 200)          : null,
    slug_suggestion:  slug,
    category:         ['jewelry', 'apparel', 'art'].includes(draft.category) ? draft.category          : null,
    description:      typeof draft.description === 'string'      ? draft.description.slice(0, 1200)     : null,
    description_ja:   typeof draft.description_ja === 'string'   ? draft.description_ja.slice(0, 1200)  : null,
    story:            typeof draft.story === 'string'            ? draft.story.slice(0, 300)            : null,
    story_ja:         typeof draft.story_ja === 'string'         ? draft.story_ja.slice(0, 300)         : null,
    seo_title:        typeof draft.seo_title === 'string'        ? draft.seo_title.slice(0, 120)        : null,
    seo_description:  typeof draft.seo_description === 'string'  ? draft.seo_description.slice(0, 300)  : null,
    tags: Array.isArray(draft.tags)
      ? draft.tags.filter(t => typeof t === 'string' && t.trim()).slice(0, 12).map(t => t.slice(0, 60))
      : [],
    specs: Array.isArray(draft.specs)
      ? draft.specs
          .filter(s => s?.label && s?.value)
          .slice(0, 30)
          .map(s => ({ label: String(s.label).slice(0, 100), value: String(s.value).slice(0, 300) }))
      : [],
    variant_suggestions: Array.isArray(draft.variant_suggestions)
      ? draft.variant_suggestions
          .filter(v => v?.type && Array.isArray(v?.options))
          .slice(0, 5)
      : [],
    review_required: Array.isArray(draft.review_required)
      ? draft.review_required.filter(f => typeof f === 'string').slice(0, 20)
      : [],
  }

  return NextResponse.json({ draft: sanitized })
}
