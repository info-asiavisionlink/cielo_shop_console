'use server'
import { createAdminClient } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

function slugify(text) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').slice(0, 60)
}

export async function getProducts(category = 'all') {
  const db = createAdminClient()
  let q = db.from('products').select(`
    id, slug, name, name_ja, category, subcategory, product_type,
    price, stock_count, status, featured, created_at,
    product_images ( image_url, is_thumbnail )
  `).order('created_at', { ascending: false })
  if (category !== 'all') q = q.eq('category', category)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data
}

export async function getProduct(id) {
  const db = createAdminClient()
  const { data, error } = await db.from('products')
    .select(`
      *,
      product_specs ( id, spec_type, spec_key, spec_value, sort_order ),
      product_images ( id, image_url, alt_text, sort_order, is_thumbnail ),
      product_variants ( id, sku, type, label, label_ja, stock_count, price_modifier, sort_order ),
      product_tags ( tag_id, tags ( id, name, name_ja ) )
    `)
    .eq('id', id).single()
  if (error) throw new Error(error.message)
  return data
}

export async function getTags() {
  const db = createAdminClient()
  const { data, error } = await db.from('tags').select('id, name, name_ja').order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

function parseTypesJson(raw) {
  try {
    if (!raw || raw === '[]' || raw === 'null') return null
    const arr = JSON.parse(raw)
    return Array.isArray(arr) && arr.length ? arr : null
  } catch { return null }
}

export async function createProduct(formData) {
  const db = createAdminClient()
  const name = formData.get('name')
  const slug = slugify(formData.get('slug') || name)
  const category = formData.get('category')

  const payload = {
    slug,
    name,
    name_ja:        formData.get('name_ja')        || null,
    category,
    subcategory:    formData.get('subcategory')     || '',
    product_type:   formData.get('product_type')    || null,
    price:          parseInt(formData.get('price'), 10)       || 0,
    stock_count:    parseInt(formData.get('stock_count'), 10) || 0,
    status:         formData.get('status')          || 'draft',
    featured:            formData.get('featured') === 'true',
    description:         formData.get('description')     || null,
    description_ja:      formData.get('description_ja') || null,
    story:               formData.get('story')            || null,
    story_ja:            formData.get('story_ja')         || null,
    og_image_url:        formData.get('og_image_url')     || null,
    seo_title:           formData.get('seo_title')        || null,
    seo_description:     formData.get('seo_description')  || null,
    engraving_available: formData.get('engraving_available') === 'true',
    engraving_required:  formData.get('engraving_required')  === 'true',
    engraving_max_chars: parseInt(formData.get('engraving_max_chars') || '20', 10) || 20,
    inscription_available_types: parseTypesJson(formData.get('inscription_available_types')),
    inscription_location: formData.get('inscription_location') || null,
    attributes:          {},
  }

  const { data, error } = await db.from('products').insert(payload).select('id').single()
  if (error) throw new Error(error.message)
  const productId = data.id

  await _saveImages(db, productId, formData.get('images_json'))
  await _saveSpecs(db, productId, category, formData.get('specs_json'))
  await _saveCareSpecs(db, productId, formData.get('care_json'))
  await _saveVariants(db, productId, formData.get('variants_json'))
  await _saveTags(db, productId, formData.get('tags_json'))

  revalidatePath('/products')
  return productId
}

export async function updateProduct(id, formData) {
  const db = createAdminClient()
  const category = formData.get('category')

  const payload = {
    name:           formData.get('name'),
    name_ja:        formData.get('name_ja')        || null,
    category,
    subcategory:    formData.get('subcategory')     || '',
    product_type:   formData.get('product_type')    || null,
    price:          parseInt(formData.get('price'), 10)       || 0,
    stock_count:    parseInt(formData.get('stock_count'), 10) || 0,
    status:         formData.get('status'),
    featured:            formData.get('featured') === 'true',
    description:         formData.get('description')     || null,
    description_ja:      formData.get('description_ja') || null,
    story:               formData.get('story')            || null,
    story_ja:            formData.get('story_ja')         || null,
    og_image_url:        formData.get('og_image_url')     || null,
    seo_title:           formData.get('seo_title')        || null,
    seo_description:     formData.get('seo_description')  || null,
    engraving_available: formData.get('engraving_available') === 'true',
    engraving_required:  formData.get('engraving_required')  === 'true',
    engraving_max_chars: parseInt(formData.get('engraving_max_chars') || '20', 10) || 20,
    inscription_available_types: parseTypesJson(formData.get('inscription_available_types')),
    inscription_location: formData.get('inscription_location') || null,
  }

  const { error } = await db.from('products').update(payload).eq('id', id)
  if (error) throw new Error(error.message)

  await _saveImages(db, id, formData.get('images_json'))
  await _saveSpecs(db, id, category, formData.get('specs_json'))
  await _saveCareSpecs(db, id, formData.get('care_json'))
  await _saveVariants(db, id, formData.get('variants_json'))
  await _saveTags(db, id, formData.get('tags_json'))

  revalidatePath('/products')
  revalidatePath(`/products/${id}`)
}

/* ── Helpers ── */

async function _saveImages(db, productId, imagesJson) {
  let images = []
  try { if (imagesJson) images = JSON.parse(imagesJson) } catch {}
  const valid = images.filter(img => img.url?.trim())
  if (!valid.length) return

  await db.from('product_images').delete().eq('product_id', productId)
  await db.from('product_images').insert(valid.map((img, i) => ({
    product_id:   productId,
    image_url:    img.url.trim(),
    alt_text:     img.alt || null,
    is_thumbnail: i === 0,
    sort_order:   i,
  })))
}

async function _saveSpecs(db, productId, category, specsJson) {
  let specs = []
  try { if (specsJson) specs = JSON.parse(specsJson) } catch {}
  const valid = specs.filter(s => s.spec_key?.trim() && s.spec_value?.trim())

  // care タイプは別関数で管理するため削除しない
  await db.from('product_specs').delete().eq('product_id', productId).neq('spec_type', 'care')
  if (!valid.length) return

  await db.from('product_specs').insert(valid.map((s, i) => ({
    product_id: productId,
    spec_type:  category || 'apparel',
    spec_key:   s.spec_key.trim(),
    spec_value: s.spec_value.trim(),
    sort_order: i,
  })))
}

async function _saveCareSpecs(db, productId, careJson) {
  let care = {}
  try { if (careJson) care = JSON.parse(careJson) } catch {}
  const entries = Object.entries(care).filter(([, v]) => v?.trim())
  if (!entries.length) return

  await db.from('product_specs').delete().eq('product_id', productId).eq('spec_type', 'care')
  await db.from('product_specs').insert(entries.map(([key, value], i) => ({
    product_id: productId,
    spec_type:  'care',
    spec_key:   key,
    spec_value: value.trim(),
    sort_order: i,
  })))
}

async function _saveVariants(db, productId, variantsJson) {
  let variants = []
  try { if (variantsJson) variants = JSON.parse(variantsJson) } catch {}
  const valid = variants.filter(v => v.label?.trim())
  if (!valid.length) return

  await db.from('product_variants').delete().eq('product_id', productId)
  await db.from('product_variants').insert(valid.map((v, i) => ({
    product_id:     productId,
    sku:            v.sku?.trim() || `${productId.slice(0, 8)}-V${i + 1}`,
    type:           v.type || 'size',
    label:          v.label.trim(),
    label_ja:       v.label_ja?.trim() || null,
    stock_count:    9999,  // OEM在庫レス運用のため常に9999
    price_modifier: parseInt(v.price_modifier) || 0,
    sort_order:     i,
  })))
}

async function _saveTags(db, productId, tagsJson) {
  let tags = []
  try { if (tagsJson) tags = JSON.parse(tagsJson) } catch {}
  if (!tags.length) return

  const tagIds = []
  for (const tag of tags) {
    if (tag.id) {
      tagIds.push(tag.id)
    } else if (tag.name?.trim()) {
      const { data } = await db.from('tags')
        .upsert({ name: tag.name.trim().toLowerCase(), name_ja: tag.name_ja?.trim() || null }, { onConflict: 'name' })
        .select('id').single()
      if (data) tagIds.push(data.id)
    }
  }

  await db.from('product_tags').delete().eq('product_id', productId)
  if (tagIds.length) {
    await db.from('product_tags').insert(tagIds.map(tag_id => ({ product_id: productId, tag_id })))
  }
}

export async function toggleProductStatus(id, currentStatus) {
  const db = createAdminClient()
  const next = currentStatus === 'active' ? 'draft' : 'active'
  const { error } = await db.from('products').update({ status: next }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/products')
}

export async function toggleProductFeatured(id, currentFeatured) {
  const db = createAdminClient()
  const { error } = await db.from('products').update({ featured: !currentFeatured }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/products')
}

export async function deleteProduct(id) {
  const db = createAdminClient()
  const { error } = await db.from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/products')
}
