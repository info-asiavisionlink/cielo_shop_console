'use client'
import { useState, useEffect } from 'react'
import { getOrders, updateTracking, updateOrderStatus } from '@/actions/orders'

/* ── 配送先テキスト生成（日本式）── */
function buildAddressLines(order) {
  const addr  = order.shipping_address || {}
  const lines = []
  if (addr.postal_code) lines.push(`〒${addr.postal_code}`)
  const pref  = addr.state || addr.prefecture || ''
  const city  = addr.city  || ''
  const line1 = addr.line1 || ''
  if (pref || city || line1) lines.push([pref, city, line1].filter(Boolean).join(''))
  if (addr.line2)           lines.push(addr.line2)
  if (order.shipping_name)  lines.push(order.shipping_name + ' 様')
  if (order.shipping_phone) lines.push(order.shipping_phone)
  return lines
}

/* ── コピーボタン ── */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }
  return (
    <button
      type="button"
      onClick={handle}
      style={{
        fontSize: 10, padding: '2px 7px', marginTop: 4,
        border: '1px solid var(--border-h)', background: 'none',
        color: 'var(--text-3)', cursor: 'pointer',
        borderRadius: 'var(--r-sm)', letterSpacing: '0.06em',
      }}
    >
      {copied ? '✓ コピー済み' : '住所コピー'}
    </button>
  )
}

export default function ShippingPage() {
  const [orders,   setOrders]   = useState([])
  const [error,    setError]    = useState('')
  const [tracking, setTracking] = useState({})
  const [success,  setSuccess]  = useState('')

  async function load() {
    try {
      const [paid, proc] = await Promise.all([
        getOrders('paid'),
        getOrders('processing'),
      ])
      setOrders([...paid, ...proc].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)))
    } catch (e) { setError(e.message) }
  }

  useEffect(() => { load() }, [])

  async function ship(id) {
    const num = tracking[id]?.trim()
    if (!num) { setError('追跡番号を入力してください'); return }
    setError('')
    try {
      await updateTracking(id, num)
      setSuccess(`発送済みに更新しました（追跡: ${num}）`)
      await load()
      setTimeout(() => setSuccess(''), 4000)
    } catch (e) { setError(e.message) }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">配送</h1>
          <p className="page-sub">発送待ち {orders.length}件</p>
        </div>
      </div>
      <div className="page-content">
        {error   && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {orders.length === 0 ? (
          <div className="table-wrap">
            <div className="empty-state">
              <p>📬</p>
              <p>発送待ちの注文はありません</p>
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <div className="table-header">
              <span className="table-title">発送待ち一覧（paid / processing）</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>注文日</th>
                  <th>顧客</th>
                  <th>商品 / 刻印</th>
                  <th>配送先</th>
                  <th>金額</th>
                  <th>ステータス</th>
                  <th>追跡番号 → 発送済み</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const addrLines = buildAddressLines(o)
                  const copyText  = addrLines.join('\n')
                  return (
                    <tr key={o.id}>
                      <td className="td-mono" style={{ whiteSpace: 'nowrap' }}>
                        {new Date(o.created_at).toLocaleDateString('ja-JP')}
                      </td>

                      {/* 顧客 */}
                      <td>
                        <div className="td-name">{o.customer_name || '—'}</div>
                        <div className="td-mono" style={{ fontSize: 11 }}>{o.customer_email || ''}</div>
                      </td>

                      {/* 商品 / 刻印 */}
                      <td>
                        {(o.order_items || []).map((item, i) => (
                          <div key={i} style={{ marginBottom: i < (o.order_items.length - 1) ? 4 : 0 }}>
                            <div className="td-mono" style={{ fontSize: 12 }}>
                              {item.product_name} × {item.quantity}
                            </div>
                            {item.variant_label && (
                              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{item.variant_label}</div>
                            )}
                            {item.engraving_type && (
                              <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 2 }}>
                                {item.engraving_type === 'personal_mark' ? 'お名前' : item.engraving_type === 'date' ? '日付' : 'メッセージ'}: {item.engraving_text || '—'}
                              </div>
                            )}
                          </div>
                        ))}
                      </td>

                      {/* 配送先 */}
                      <td style={{ minWidth: 160 }}>
                        {addrLines.length > 0 ? (
                          <div>
                            <div style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.75, color: 'var(--text-2)' }}>
                              {addrLines.map((line, i) => (
                                <div key={i} style={{ color: i >= addrLines.length - (o.shipping_name ? 2 : 0) - (o.shipping_phone ? 1 : 0) ? 'var(--text)' : undefined }}>
                                  {line}
                                </div>
                              ))}
                            </div>
                            {copyText && <CopyBtn text={copyText} />}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>住所なし</span>
                        )}
                      </td>

                      {/* 金額 */}
                      <td className="td-price">¥{(o.total ?? 0).toLocaleString('ja-JP')}</td>

                      {/* ステータス */}
                      <td>
                        <span className={`badge badge-${o.status}`}>
                          {o.status === 'paid' ? '支払い済' : '梱包中'}
                        </span>
                      </td>

                      {/* 追跡番号 */}
                      <td>
                        <div className="tracking-row">
                          <input
                            className="tracking-input"
                            placeholder="例: 123456789012"
                            value={tracking[o.id] || ''}
                            onChange={e => setTracking(t => ({ ...t, [o.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && ship(o.id)}
                          />
                          <button className="btn btn-primary btn-sm" onClick={() => ship(o.id)}>
                            発送済みにする
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
