'use client'
import { useState, useEffect } from 'react'
import { getOrders, updateTracking, updateOrderStatus } from '@/actions/orders'

export default function ShippingPage() {
  const [orders, setOrders]     = useState([])
  const [error,  setError]      = useState('')
  const [tracking, setTracking] = useState({})
  const [success,  setSuccess]  = useState('')

  async function load() {
    try {
      // 発送待ち = paid + processing
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
          <h1 className="page-title">Shipping</h1>
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
                  <th>商品</th>
                  <th>金額</th>
                  <th>ステータス</th>
                  <th>追跡番号 → 発送済みにする</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td className="td-mono">{new Date(o.created_at).toLocaleDateString('ja-JP')}</td>
                    <td>
                      <div className="td-name">{o.customer_name || '—'}</div>
                      <div className="td-mono">{o.customer_email || ''}</div>
                    </td>
                    <td>
                      {(o.order_items || []).map((item, i) => (
                        <div key={i} className="td-mono">{item.product_name} × {item.quantity}</div>
                      ))}
                    </td>
                    <td className="td-price">¥{(o.total ?? 0).toLocaleString('ja-JP')}</td>
                    <td>
                      <span className={`badge badge-${o.status}`}>
                        {o.status === 'paid' ? '支払い済' : '処理中'}
                      </span>
                    </td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
