'use server'
import { createAdminClient } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

// ─────────────────────────────────────────────
// Hero Slides — READ (admin: all, not filtered by is_active)
// ─────────────────────────────────────────────
export async function getHeroSlides() {
  const db = createAdminClient()
  const { data, error } = await db
    .from('hero_slides')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at',    { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

// ─────────────────────────────────────────────
// Hero Slides — CREATE
// ─────────────────────────────────────────────
export async function createHeroSlide(formData) {
  const db = createAdminClient()

  const { count } = await db
    .from('hero_slides')
    .select('*', { count: 'exact', head: true })
  const nextOrder = (count ?? 0)

  const payload = buildPayload(formData, nextOrder)

  const { error } = await db.from('hero_slides').insert(payload)
  if (error) throw new Error(error.message)
  revalidatePath('/experience/hero')
}

// ─────────────────────────────────────────────
// Hero Slides — UPDATE
// ─────────────────────────────────────────────
export async function updateHeroSlide(id, formData) {
  const db = createAdminClient()

  const { data: existing } = await db
    .from('hero_slides').select('display_order').eq('id', id).single()

  const payload = buildPayload(formData, existing?.display_order ?? 0)

  const { error } = await db.from('hero_slides').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/experience/hero')
}

// ─────────────────────────────────────────────
// Hero Slides — DELETE
// ─────────────────────────────────────────────
export async function deleteHeroSlide(id) {
  const db = createAdminClient()
  const { error } = await db.from('hero_slides').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/experience/hero')
}

// ─────────────────────────────────────────────
// Hero Slides — TOGGLE ACTIVE
// ─────────────────────────────────────────────
export async function toggleHeroSlide(id, isActive) {
  const db = createAdminClient()
  const { error } = await db
    .from('hero_slides')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/experience/hero')
}

// ─────────────────────────────────────────────
// Hero Slides — REORDER (swap with adjacent)
// ─────────────────────────────────────────────
export async function reorderHeroSlide(id, direction) {
  const db = createAdminClient()

  const { data: slides } = await db
    .from('hero_slides')
    .select('id, display_order')
    .order('display_order', { ascending: true })

  if (!slides || slides.length < 2) return

  const idx = slides.findIndex(s => s.id === id)
  if (idx < 0) return

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1
  if (targetIdx < 0 || targetIdx >= slides.length) return

  const a = slides[idx]
  const b = slides[targetIdx]

  await Promise.all([
    db.from('hero_slides').update({ display_order: b.display_order }).eq('id', a.id),
    db.from('hero_slides').update({ display_order: a.display_order }).eq('id', b.id),
  ])

  revalidatePath('/experience/hero')
}

// ─────────────────────────────────────────────
// Internal helper
// ─────────────────────────────────────────────
function buildPayload(formData, displayOrder) {
  const g = key => formData.get(key)
  return {
    title:             g('title')             || null,
    subtitle:          g('subtitle')          || null,
    eyebrow_label:     g('eyebrow_label')     || null,
    desktop_image_url: g('desktop_image_url') || null,
    mobile_image_url:  g('mobile_image_url')  || null,
    media_type:        g('media_type')        || 'image',
    video_url:         g('video_url')         || null,
    overlay_opacity:   parseFloat(g('overlay_opacity') ?? '0.65'),
    text_position:     g('text_position')     || 'center',
    cta_label:         g('cta_label')         || null,
    cta_link:          g('cta_link')          || null,
    display_order:     parseInt(g('display_order') ?? String(displayOrder), 10),
    is_active:         g('is_active') === 'true',
    start_date:        g('start_date') || null,
    end_date:          g('end_date')   || null,
    transition_duration: parseInt(g('transition_duration') ?? '1200', 10),
  }
}
