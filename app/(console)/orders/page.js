'use client'
import { useState, useEffect, useCallback } from 'react'
import { getOrders, updateOrderStatus, updateTracking, updateOrderNotes } from '@/actions/orders'

const ENG_TYPE_LABELS = {
  personal_mark: 'イニシャル・お名前',
  date:          '日付刻印',
  short_message: 'メッセージ',
}

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

/* ── 配送先を日本式住所フォーマットに変換 ──
   Stripe の address 構造:
     { postal_code, state (都道府県), city, line1, line2, country }
   日本式: 〒postal_code\n都道府県 city line1\nline2
*/
function formatShippingAddress(addr) {
  if (!addr) return null
  const parts = []
  if (addr.postal_code) parts.push(`〒${addr.postal_code}`)
  const prefecture = addr.state || addr.prefecture || ''
  const city       = addr.city  || ''
  const line1      = addr.line1 || ''
  if (prefecture || city || line1) parts.push([prefecture, city, line1].filter(Boolean).join(''))
  if (addr.line2) parts.push(addr.line2)
  return parts.join('\n')
}

/* ── 配送先全情報（コピー用） ── */
function buildCopyText(o) {
  const lines = []
  const addr  = o.shipping_address || {}

  if (addr.postal_code) lines.push(`〒${addr.postal_code}`)
  const prefecture = addr.state || addr.prefecture || ''
  const city       = addr.city  || ''
  const line1      = addr.line1 || ''
  if (prefecture || city || line1) lines.push([prefecture, city, line1].filter(Boolean).join(''))
  if (addr.line2) lines.push(addr.line2)
  if (o.shipping_name) lines.push(o.shipping_name + ' 様')
  if (o.shipping_phone) lines.push(o.shipping_phone)
  return lines.join('\n')
}

/* ── コピーボタン ── */
function CopyBtn({ text, label }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* unsupported env */ }
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        fontSize: 10, padding: '3px 8px',
        border: '1px solid var(--border-h)',
        background: 'none', color: 'var(--text-3)',
        cursor: 'pointer', borderRadius: 'var(--r-sm)',
        letterSpacing: '0.06em',
        transition: 'color 0.2s, border-color 0.2s',
      }}
      title="クリップボードにコピー"
    >
      {copied ? '✓ コピー済み' : (label || '住所をコピー')}
    </button>
  )
}

/* ── 配送先表示ブロック ── */
function ShippingBlock({ order }) {
  const addr  = order.shipping_address
  const name  = order.shipping_name
  const phone = order.shipping_phone

  if (!addr && !name && !phone) {
    return (
      <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>
        配送先情報なし
      </div>
    )
  }

  const postalCode  = addr?.postal_code || ''
  const prefecture  = addr?.state || addr?.prefecture || ''
  const city        = addr?.city  || ''
  const line1       = addr?.line1 || ''
  const line2       = addr?.line2 || ''
  const copyText    = buildCopyText(order)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Shipping Address
        </span>
        {copyText && <CopyBtn text={copyText} label="住所をコピー" />}
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8, color: 'var(--text-2)' }}>
        {postalCode && <div>〒{postalCode}</div>}
        {(prefecture || city || line1) && (
          <div>{[prefecture, city, line1].filter(Boolean).join('')}</div>
        )}
        {line2 && <div>{line2}</div>}
        {name && (
          <div style={{ marginTop: 4, color: 'var(--text)' }}>{name} 様</div>
        )}
        {phone && <div style={{ color: 'var(--text-2)' }}>{phone}</div>}
      </div>
    </div>
  )
}

export default function OrdersPage() {
  const [orders,   setOrders]   = useState([])
  const [filter,   setFilter]   = useState('all')
  const [error,    setError]    = useState('')
  const [tracking, setTracking] = useState({})
  const [expanded, setExpanded] = useState(new Set())
  const [notes,    setNotes]    = useState({})

  const load = useCallback(async () => {
    try { setOrders(await getOrders(filter)) }
    catch (e) { setError(e.message) }
  }, [filter])

  useEffect(() => { load() }, [load])

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
                    <tr
                      key={o.id}
                      style={{ cursor: items.length ? 'pointer' : 'default' }}
                      onClick={() => items.length && toggleExpand(o.id)}
                    >
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
                      <tr key={`${o.id}-detail`} style={{ background: 'rgba(240,244,255,0.02)' }}>
                        <td />
                        <td colSpan={7} style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

                            {/* 注文明細 */}
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                Order Items
                              </div>
                              <table style={{ width: '100%', fontSize: 12 }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 500, color: 'var(--text-3)', fontSize: 11 }}>商品</th>
                                    <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 500, color: 'var(--text-3)', fontSize: 11 }}>単価</th>
                                    <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 500, color: 'var(--text-3)', fontSize: 11 }}>数量</th>
                                    <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 500, color: 'var(--text-3)', fontSize: 11 }}>小計</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map(item => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                      <td style={{ padding: '6px 6px' }}>
                                        <div>{item.product_name}</div>
                                        {item.variant_label && (
                                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                                            {item.variant_label}
                                          </div>
                                        )}
                                        {item.engraving_type && (
                                          <div style={{ marginTop: 4, padding: '4px 0', borderTop: '1px solid var(--border)' }}>
                                            <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em' }}>
                                              {ENG_TYPE_LABELS[item.engraving_type] || item.engraving_type}
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--gold)', letterSpacing: '0.06em' }}>
                                              {item.engraving_text || '—'}
                                            </div>
                                          </div>
                                        )}
                                        {!item.engraving_type && (
                                          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3, fontStyle: 'italic' }}>
                                            刻印なし
                                          </div>
                                        )}
                                      </td>
                                      <td style={{ padding: '6px 6px', textAlign: 'right', fontFamily: 'monospace' }}>
                                        ¥{(item.unit_price ?? 0).toLocaleString('ja-JP')}
                                      </td>
                                      <td style={{ padding: '6px 6px', textAlign: 'right' }}>{item.quantity}</td>
                                      <td style={{ padding: '6px 6px', textAlign: 'right', color: 'var(--gold)', fontFamily: 'monospace' }}>
                                        ¥{(item.subtotal ?? 0).toLocaleString('ja-JP')}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* 右カラム: 配送先 + メモ */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                              {/* 配送先 */}
                              <ShippingBlock order={o} />

                              {/* メモ */}
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Notes</div>
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
