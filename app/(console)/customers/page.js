import { getCustomers } from '@/actions/orders'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  let customers = []
  try { customers = await getCustomers() } catch {}

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-sub">全{customers.length}件</p>
        </div>
      </div>
      <div className="page-content">
        <div className="table-wrap">
          {customers.length === 0 ? (
            <div className="empty-state"><p>👥</p><p>顧客情報がありません</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>名前</th>
                  <th>メールアドレス</th>
                  <th>電話番号</th>
                  <th>登録日</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id}>
                    <td className="td-name">{c.name}</td>
                    <td className="td-mono">{c.email}</td>
                    <td className="td-mono">{c.phone || '—'}</td>
                    <td className="td-mono">{new Date(c.created_at).toLocaleDateString('ja-JP')}</td>
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
