import { getDashboardStats } from '@/actions/orders'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  let stats = { activeProducts: 0, totalOrders: 0, pendingOrders: 0, totalRevenue: 0, totalCustomers: 0, recentOrders: [] }
  try { stats = await getDashboardStats() } catch {}

  const STATUS_MAP = {
    pending: '未確認', paid: '支払い済', processing: '処理中',
    shipped: '発送済', delivered: '配達完了', cancelled: 'キャンセル', refunded: '返金',
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">CIELO SHOP 管理概要</p>
        </div>
      </div>
      <div className="page-content">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">公開中の商品</div>
            <div className="stat-value blue">{stats.activeProducts}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">総注文数</div>
            <div className="stat-value">{stats.totalOrders}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">対応待ち注文</div>
            <div className="stat-value" style={{ color: stats.pendingOrders > 0 ? 'var(--orange)' : undefined }}>
              {stats.pendingOrders}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">総売上</div>
            <div className="stat-value gold">
              ¥{stats.totalRevenue.toLocaleString('ja-JP')}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">顧客数</div>
            <div className="stat-value">{stats.totalCustomers}</div>
          </div>
        </div>

        <div className="table-wrap">
          <div className="table-header">
            <span className="table-title">最近の注文</span>
            <Link href="/orders" className="btn btn-ghost btn-sm">すべて見る →</Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <div className="empty-state">
              <p>📋</p>
              <p>注文はまだありません</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>顧客</th>
                  <th>金額</th>
                  <th>ステータス</th>
                  <th>日時</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map(o => (
                  <tr key={o.id}>
                    <td>
                      <div className="td-name">{o.customer_name || '—'}</div>
                      <div className="td-mono">{o.customer_email || ''}</div>
                    </td>
                    <td className="td-price">¥{(o.total ?? 0).toLocaleString('ja-JP')}</td>
                    <td>
                      <span className={`badge badge-${o.status}`}>{STATUS_MAP[o.status] ?? o.status}</span>
                    </td>
                    <td className="td-mono">{new Date(o.created_at).toLocaleDateString('ja-JP')}</td>
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
