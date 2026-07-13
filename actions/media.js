'use server'
import { createAdminClient } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

export async function getSiteImages(site = 'website') {
  const db = createAdminClient()
  const { data, error } = await db
    .from('site_images')
    .select('*')
    .eq('site', site)
    .order('section')
    .order('display_order', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function updateSiteImage(id, { image_url, mobile_image_url, alt_text }) {
  const db = createAdminClient()
  const clean = s => (typeof s === 'string' ? s.trim() : '')
  const { error } = await db
    .from('site_images')
    .update({
      image_url:        clean(image_url),
      mobile_image_url: clean(mobile_image_url),
      alt_text:         clean(alt_text),
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/media')
}

export async function reorderSiteImage(id, direction) {
  const db = createAdminClient()

  const { data: item } = await db
    .from('site_images')
    .select('site, section, display_order')
    .eq('id', id)
    .single()
  if (!item) return

  const { data: siblings } = await db
    .from('site_images')
    .select('id, display_order')
    .eq('site', item.site)
    .eq('section', item.section)
    .order('display_order', { ascending: true })
  if (!siblings || siblings.length < 2) return

  const idx = siblings.findIndex(s => s.id === id)
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1
  if (targetIdx < 0 || targetIdx >= siblings.length) return

  const a = siblings[idx]
  const b = siblings[targetIdx]
  await Promise.all([
    db.from('site_images').update({ display_order: b.display_order }).eq('id', a.id),
    db.from('site_images').update({ display_order: a.display_order }).eq('id', b.id),
  ])
  revalidatePath('/media')
}
