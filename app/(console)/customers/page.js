import { getCustomersWithStats } from '@/actions/orders'

export const dynamic = 'force-dynamic'

function getRank(totalSpent, orderCount) {
  if (totalSpent >= 500000 || orderCount >= 10) return { label: 'VIP',    color: '#7C3AED', bg: '#EDE9FE' }
  if (totalSpent >= 200000 || orderCount >= 5)  return { label: 'Gold',   color: '#92400E', bg: '#FEF3C7' }
  if (totalSpent >= 50000  || orderCount >= 2)  return { label: 'Silver', color: '#374151', bg: '#F3F4F6' }
  return                                               { label: 'Bronze', color: '#9A3412', bg: '#FFF7ED' }
}

export default async function CustomersPage() {
  let customers = []
  try { customers = await getCustomersWithStats() } catch {}

  const vipGoldCount  = customers.filter(c => ['VIP','Gold'].includes(getRank(c.total_spent, c.order_count).label)).length
  const totalRevenue  = customers.reduce((s, c) => s + c.total_spent, 0)
  const repeatCount   = customers.filter(c => c.order_count >= 2).length

  const STATUS_MAP = {
    pending: '未確認', paid: '支払い済', processing: '処理中',
    shipped: '発送済', delivered: '配達完了', cancelled: 'キャンセル', refunded: '返金',
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-sub">全{customers.length}件</p>
        </div>
      </div>
      <div className="page-content">

        {/* KPI */}
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">総顧客数</div>
            <div className="stat-value">{customers.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">VIP / Gold</div>
            <div className="stat-value gold">{vipGoldCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">リピーター</div>
            <div className="stat-value blue">{repeatCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">顧客累計売上</div>
            <div className="stat-value gold">¥{totalRevenue.toLocaleString('ja-JP')}</div>
          </div>
        </div>

        {/* 会員ランク基準 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'VIP',    desc: '¥500,000+  or  10注文+', color: '#7C3AED', bg: '#EDE9FE' },
            { label: 'Gold',   desc: '¥200,000+  or  5注文+',  color: '#92400E', bg: '#FEF3C7' },
            { label: 'Silver', desc: '¥50,000+   or  2注文+',  color: '#374151', bg: '#F3F4F6' },
            { label: 'Bronze', desc: '初回購入',                color: '#9A3412', bg: '#FFF7ED' },
          ].map(r => (
            <span key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)' }}>
              <span style={{ padding: '2px 8px', borderRadius: 12, fontWeight: 600, fontSize: 11, background: r.bg, color: r.color }}>{r.label}</span>
              {r.desc}
            </span>
          ))}
        </div>

        <div className="table-wrap">
          {customers.length === 0 ? (
            <div className="empty-state"><p>👥</p><p>顧客情報がありません</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>顧客</th>
                  <th>会員ランク</th>
                  <th>購入回数</th>
                  <th>累計購入金額</th>
                  <th>最終購入日</th>
                  <th>登録日</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => {
                  const rank = getRank(c.total_spent, c.order_count)
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="td-name">{c.name}</div>
                        <div className="td-mono">{c.email}</div>
                        {c.phone && <div className="td-mono" style={{ color: 'var(--text-3)' }}>{c.phone}</div>}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          background: rank.bg,
                          color: rank.color,
                        }}>
                          {rank.label}
                        </span>
                      </td>
                      <td className="td-mono">{c.order_count}回</td>
                      <td className="td-price">¥{c.total_spent.toLocaleString('ja-JP')}</td>
                      <td className="td-mono">
                        {c.last_order_at
                          ? new Date(c.last_order_at).toLocaleDateString('ja-JP')
                          : <span style={{ color: 'var(--text-3)' }}>—</span>}
                      </td>
                      <td className="td-mono">{new Date(c.created_at).toLocaleDateString('ja-JP')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
