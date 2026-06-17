'use server'
import { createAdminClient } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

export async function getOrders(status = 'all') {
  const db = createAdminClient()
  let q = db.from('orders')
    .select(`
      id, status, total, tracking_number, created_at, updated_at,
      customer_name, customer_email,
      order_items ( quantity, product_name, unit_price )
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

export async function getDashboardStats() {
  const db = createAdminClient()
  const [products, orders, customers] = await Promise.all([
    db.from('products').select('id, status', { count: 'exact' }),
    db.from('orders').select('id, status, total', { count: 'exact' }),
    db.from('customers').select('id', { count: 'exact' }),
  ])

  const activeProducts = (products.data ?? []).filter(p => p.status === 'active').length
  const totalOrders    = orders.count ?? 0
  const pendingOrders  = (orders.data ?? []).filter(o => ['paid','processing'].includes(o.status)).length
  const totalRevenue   = (orders.data ?? [])
    .filter(o => !['pending','cancelled'].includes(o.status))
    .reduce((s, o) => s + (o.total ?? 0), 0)
  const totalCustomers = customers.count ?? 0

  const { data: recentOrders } = await db.from('orders')
    .select('id, customer_name, customer_email, total, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return { activeProducts, totalOrders, pendingOrders, totalRevenue, totalCustomers, recentOrders: recentOrders ?? [] }
}

export async function getCustomers() {
  const db = createAdminClient()
  const { data, error } = await db.from('customers')
    .select('id, name, email, phone, created_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}
