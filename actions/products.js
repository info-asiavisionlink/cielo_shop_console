'use server'
import { createAdminClient } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

function slugify(text) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').slice(0, 60)
}

export async function getProducts(category = 'all') {
  const db = createAdminClient()
  let q = db.from('products').select(`
    id, slug, name, name_ja, category, subcategory,
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
    .select(`*, product_images ( id, image_url, alt_text, sort_order, is_thumbnail )`)
    .eq('id', id).single()
  if (error) throw new Error(error.message)
  return data
}

export async function createProduct(formData) {
  const db = createAdminClient()
  const name = formData.get('name')
  const slug = slugify(formData.get('slug') || name)
  const payload = {
    slug,
    name,
    name_ja:        formData.get('name_ja') || null,
    category:       formData.get('category'),
    subcategory:    formData.get('subcategory') || '',
    price:          parseInt(formData.get('price'), 10) || 0,
    stock_count:    parseInt(formData.get('stock_count'), 10) || 0,
    status:         formData.get('status') || 'draft',
    featured:       formData.get('featured') === 'true',
    description:    formData.get('description') || null,
    description_ja: formData.get('description_ja') || null,
    story:          formData.get('story') || null,
    story_ja:       formData.get('story_ja') || null,
    og_image_url:   formData.get('og_image_url') || null,
  }
  const { data, error } = await db.from('products').insert(payload).select('id').single()
  if (error) throw new Error(error.message)

  // サムネイル画像URL
  const imageUrl = formData.get('image_url')
  if (imageUrl) {
    await db.from('product_images').insert({
      product_id: data.id, image_url: imageUrl, is_thumbnail: true, sort_order: 0,
    })
  }

  revalidatePath('/products')
  return data.id
}

export async function updateProduct(id, formData) {
  const db = createAdminClient()
  const payload = {
    name:           formData.get('name'),
    name_ja:        formData.get('name_ja') || null,
    category:       formData.get('category'),
    subcategory:    formData.get('subcategory') || '',
    price:          parseInt(formData.get('price'), 10) || 0,
    stock_count:    parseInt(formData.get('stock_count'), 10) || 0,
    status:         formData.get('status'),
    featured:       formData.get('featured') === 'true',
    description:    formData.get('description') || null,
    description_ja: formData.get('description_ja') || null,
    story:          formData.get('story') || null,
    story_ja:       formData.get('story_ja') || null,
    og_image_url:   formData.get('og_image_url') || null,
  }
  const { error } = await db.from('products').update(payload).eq('id', id)
  if (error) throw new Error(error.message)

  // サムネイル更新
  const imageUrl = formData.get('image_url')
  if (imageUrl) {
    const { data: existing } = await db.from('product_images')
      .select('id').eq('product_id', id).eq('is_thumbnail', true).maybeSingle()
    if (existing) {
      await db.from('product_images').update({ image_url: imageUrl }).eq('id', existing.id)
    } else {
      await db.from('product_images').insert({ product_id: id, image_url: imageUrl, is_thumbnail: true, sort_order: 0 })
    }
  }

  revalidatePath('/products')
  revalidatePath(`/products/${id}`)
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
