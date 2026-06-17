'use server'
import { createAdminClient } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

export async function getOrders(status = 'all') {
  const db = createAdminClient()
  let q = db.from('orders')
    .select(`
      id, status, total, tracking_number, created_at, updated_at,
      customer_name, customer_email, shipping_address, notes,
      order_items ( id, product_name, variant_label, unit_price, quantity, subtotal )
    `)
    .order('created_at', { ascending: false })
  if (status !== 'all') q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getOrder(id) {
  const db = createAdminClient()
  const { data, error } = await db.from('orders')
    .select(`*, order_items (*)`)
    .eq('id', id).single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateOrderStatus(id, status) {
  const db = createAdminClient()
  const { error } = await db.from('orders').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/orders')
  revalidatePath('/shipping')
  revalidatePath('/dashboard')
}

export async function updateTracking(id, tracking_number) {
  const db = createAdminClient()
  const { error } = await db.from('orders')
    .update({ tracking_number, status: 'shipped' })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/orders')
  revalidatePath('/shipping')
}

export async function updateOrderNotes(id, notes) {
  const db = createAdminClient()
  const { error } = await db.from('orders').update({ notes }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/orders')
}

export async function getDashboardStats() {
  const db = createAdminClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [products, orders, customers] = await Promise.all([
    db.from('products').select('id, status', { count: 'exact' }),
    db.from('orders').select('id, status, total, created_at', { count: 'exact' }),
    db.from('customers').select('id', { count: 'exact' }),
  ])

  const activeProducts  = (products.data ?? []).filter(p => p.status === 'active').length
  const totalOrders     = orders.count ?? 0
  const pendingOrders   = (orders.data ?? []).filter(o => ['paid','processing'].includes(o.status)).length
  const shippedPending  = (orders.data ?? []).filter(o => o.status === 'shipped').length
  const totalRevenue    = (orders.data ?? [])
    .filter(o => !['pending','cancelled','refunded'].includes(o.status))
    .reduce((s, o) => s + (o.total ?? 0), 0)
  const monthRevenue    = (orders.data ?? [])
    .filter(o => !['pending','cancelled','refunded'].includes(o.status) && o.created_at >= monthStart)
    .reduce((s, o) => s + (o.total ?? 0), 0)
  const totalCustomers  = customers.count ?? 0

  const { data: recentOrders } = await db.from('orders')
    .select('id, customer_name, customer_email, total, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return { activeProducts, totalOrders, pendingOrders, shippedPending, totalRevenue, monthRevenue, totalCustomers, recentOrders: recentOrders ?? [] }
}

export async function getCustomers() {
  const db = createAdminClient()
  const { data, error } = await db.from('customers')
    .select('id, name, email, phone, created_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getCustomersWithStats() {
  const db = createAdminClient()
  const [{ data: customers, error }, { data: orderRows }] = await Promise.all([
    db.from('customers')
      .select('id, name, email, phone, created_at')
      .order('created_at', { ascending: false }),
    db.from('orders')
      .select('customer_email, total, status, created_at')
      .not('status', 'in', '("pending","cancelled","refunded")'),
  ])
  if (error) throw new Error(error.message)

  const stats = {}
  for (const o of orderRows ?? []) {
    const e = o.customer_email
    if (!e) continue
    if (!stats[e]) stats[e] = { count: 0, total: 0, last: null }
    stats[e].count++
    stats[e].total += o.total ?? 0
    if (!stats[e].last || o.created_at > stats[e].last) stats[e].last = o.created_at
  }

  return (customers ?? [])
    .map(c => ({
      ...c,
      order_count:   stats[c.email]?.count ?? 0,
      total_spent:   stats[c.email]?.total ?? 0,
      last_order_at: stats[c.email]?.last  ?? null,
    }))
    .sort((a, b) => b.total_spent - a.total_spent)
}
