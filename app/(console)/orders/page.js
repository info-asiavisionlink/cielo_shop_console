'use client'
import { useState, useEffect } from 'react'
import { getOrders, updateOrderStatus, updateTracking, updateOrderNotes } from '@/actions/orders'

const STATUS_MAP = {
  pending:    '未確認',
  paid:       '支払い済',
  processing: '梱包中',
  shipped:    '発送済',
  delivered:  '配達完了',
  cancelled:  'キャンセル',
  refunded:   '返金',
}
const STATUS_NEXT = {
  pending:    ['paid', 'cancelled'],
  paid:       ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped:    ['delivered'],
  delivered:  [],
  cancelled:  [],
  refunded:   [],
}

export default function OrdersPage() {
  const [orders,   setOrders]   = useState([])
  const [filter,   setFilter]   = useState('all')
  const [error,    setError]    = useState('')
  const [tracking, setTracking] = useState({})
  const [expanded, setExpanded] = useState(new Set())
  const [notes,    setNotes]    = useState({})

  async function load() {
    try { setOrders(await getOrders(filter)) }
    catch (e) { setError(e.message) }
  }

  useEffect(() => { load() }, [filter])

  function toggleExpand(id) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function changeStatus(id, status) {
    try { await updateOrderStatus(id, status); await load() }
    catch (e) { setError(e.message) }
  }

  async function saveTracking(id) {
    const num = tracking[id]?.trim()
    if (!num) return
    try { await updateTracking(id, num); await load() }
    catch (e) { setError(e.message) }
  }

  async function saveNotes(id) {
    try { await updateOrderNotes(id, notes[id] ?? ''); await load() }
    catch (e) { setError(e.message) }
  }

  const FILTERS = [
    ['all','すべて'],['pending','未確認'],['paid','支払い済'],
    ['processing','梱包中'],['shipped','発送済'],['delivered','配達完了'],['cancelled','キャンセル'],
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-sub">全{orders.length}件</p>
        </div>
      </div>
      <div className="page-content">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="filter-bar">
          {FILTERS.map(([val, label]) => (
            <button
              key={val}
              className={`filter-btn${filter === val ? ' active' : ''}`}
              onClick={() => setFilter(val)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="table-wrap">
          {orders.length === 0 ? (
            <div className="empty-state"><p>🛍</p><p>注文がありません</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 32 }} />
                  <th>注文ID</th>
                  <th>顧客</th>
                  <th>金額</th>
                  <th>ステータス</th>
                  <th>追跡番号</th>
                  <th>日時</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const isOpen = expanded.has(o.id)
                  const items  = o.order_items ?? []
                  return [
                    <tr key={o.id} style={{ cursor: items.length ? 'pointer' : 'default' }} onClick={() => items.length && toggleExpand(o.id)}>
                      <td style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', userSelect: 'none' }}>
                        {items.length > 0 ? (isOpen ? '▼' : '▶') : ''}
                      </td>
                      <td className="td-mono" style={{ fontSize: 12 }}>{o.id.slice(0, 8)}…</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="td-name">{o.customer_name || '—'}</div>
                        <div className="td-mono">{o.customer_email || ''}</div>
                      </td>
                      <td className="td-price">¥{(o.total ?? 0).toLocaleString('ja-JP')}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <span className={`badge badge-${o.status}`}>{STATUS_MAP[o.status]}</span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        {o.tracking_number ? (
                          <span className="td-mono" style={{ color: 'var(--gold)' }}>{o.tracking_number}</span>
                        ) : (
                          <div className="tracking-row">
                            <input
                              className="tracking-input"
                              placeholder="追跡番号"
                              value={tracking[o.id] || ''}
                              onChange={e => setTracking(t => ({ ...t, [o.id]: e.target.value }))}
                            />
                            <button className="btn btn-ghost btn-sm" onClick={() => saveTracking(o.id)}>保存</button>
                          </div>
                        )}
                      </td>
                      <td className="td-mono">{new Date(o.created_at).toLocaleDateString('ja-JP')}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {(STATUS_NEXT[o.status] || []).map(next => (
                            <button
                              key={next}
                              className="btn btn-ghost btn-sm"
                              onClick={() => changeStatus(o.id, next)}
                            >
                              → {STATUS_MAP[next]}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>,

                    isOpen && (
                      <tr key={`${o.id}-detail`} style={{ background: 'var(--bg-2, #1a1a1a)' }}>
                        <td />
                        <td colSpan={7} style={{ padding: '12px 16px' }}>
                          {/* 注文明細 */}
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Order Items</div>
                            <table style={{ width: '100%', fontSize: 12 }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                  <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 500, color: 'var(--text-3)' }}>商品</th>
                                  <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 500, color: 'var(--text-3)' }}>バリアント</th>
                                  <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 500, color: 'var(--text-3)' }}>単価</th>
                                  <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 500, color: 'var(--text-3)' }}>数量</th>
                                  <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 500, color: 'var(--text-3)' }}>小計</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map(item => (
                                  <tr key={item.id}>
                                    <td style={{ padding: '4px 8px' }}>{item.product_name}</td>
                                    <td style={{ padding: '4px 8px', color: 'var(--text-3)' }}>{item.variant_label || '—'}</td>
                                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>¥{(item.unit_price ?? 0).toLocaleString('ja-JP')}</td>
                                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>{item.quantity}</td>
                                    <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--gold)' }}>¥{(item.subtotal ?? 0).toLocaleString('ja-JP')}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* 配送先 */}
                          {o.shipping_address && (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Shipping Address</div>
                              <div className="td-mono" style={{ fontSize: 12 }}>
                                {[o.shipping_address.postal_code, o.shipping_address.prefecture, o.shipping_address.city, o.shipping_address.line1, o.shipping_address.line2].filter(Boolean).join(' ')}
                              </div>
                            </div>
                          )}

                          {/* メモ */}
                          <div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Notes</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <input
                                className="form-input"
                                style={{ flex: 1, fontSize: 12, padding: '5px 8px' }}
                                placeholder="管理者メモ"
                                defaultValue={o.notes || ''}
                                onChange={e => setNotes(n => ({ ...n, [o.id]: e.target.value }))}
                              />
                              <button className="btn btn-ghost btn-sm" onClick={() => saveNotes(o.id)}>保存</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ),
                  ]
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
