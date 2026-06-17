'use client'
import { useState, useEffect, useTransition } from 'react'
import { getOrders, updateOrderStatus, updateTracking } from '@/actions/orders'

const STATUS_MAP = {
  pending:    '未確認',
  paid:       '支払い済',
  processing: '処理中',
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
  const [orders, setOrders]     = useState([])
  const [filter, setFilter]     = useState('all')
  const [error,  setError]      = useState('')
  const [, startTransition]     = useTransition()
  const [tracking, setTracking] = useState({})

  async function load() {
    try { setOrders(await getOrders(filter)) }
    catch (e) { setError(e.message) }
  }

  useEffect(() => { load() }, [filter])

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

        {/* Filter */}
        <div className="filter-bar">
          {[['all','すべて'],['pending','未確認'],['paid','支払い済'],['processing','処理中'],['shipped','発送済'],['delivered','配達完了'],['cancelled','キャンセル']].map(([val, label]) => (
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
                {orders.map(o => (
                  <tr key={o.id}>
                    <td className="td-mono">{o.id.slice(0,8)}...</td>
                    <td>
                      <div className="td-name">{o.customer_name || '—'}</div>
                      <div className="td-mono">{o.customer_email || ''}</div>
                    </td>
                    <td className="td-price">¥{(o.total ?? 0).toLocaleString('ja-JP')}</td>
                    <td><span className={`badge badge-${o.status}`}>{STATUS_MAP[o.status]}</span></td>
                    <td>
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
                    <td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
