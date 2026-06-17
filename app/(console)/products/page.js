import { getProducts } from '@/actions/products'
import { StatusToggle, FeaturedToggle, DeleteButton } from './_interactive'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const CAT_LABEL = { jewelry: 'Jewelry', apparel: 'Apparel', art: 'Art' }

export default async function ProductsPage({ searchParams }) {
  const cat = searchParams?.cat || 'all'
  let products = []
  try { products = await getProducts(cat) } catch {}

  const thumb = p => (p.product_images || []).find(i => i.is_thumbnail) || (p.product_images || [])[0]

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-sub">全{products.length}件</p>
        </div>
        <div className="page-actions">
          <Link href="/products/new" className="btn btn-primary">
            <PlusIcon /> 商品追加
          </Link>
        </div>
      </div>
      <div className="page-content">
        {/* Category Filter */}
        <div className="filter-bar">
          {[['all','すべて'],['jewelry','Jewelry'],['apparel','Apparel'],['art','Art']].map(([val, label]) => (
            <Link
              key={val}
              href={`/products${val === 'all' ? '' : `?cat=${val}`}`}
              className={`filter-btn${cat === val ? ' active' : ''}`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="table-wrap">
          {products.length === 0 ? (
            <div className="empty-state">
              <p>📦</p>
              <p>商品がありません</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>商品</th>
                  <th>カテゴリ</th>
                  <th>価格</th>
                  <th>在庫</th>
                  <th>ステータス</th>
                  <th>注目</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const img = thumb(p)
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {img ? (
                            <img
                              src={img.image_url}
                              alt={p.name}
                              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, background: '#222' }}
                            />
                          ) : (
                            <div style={{ width: 40, height: 40, background: '#222', borderRadius: 4 }} />
                          )}
                          <div>
                            <div className="td-name">{p.name}</div>
                            {p.name_ja && <div className="td-mono">{p.name_ja}</div>}
                          </div>
                        </div>
                      </td>
                      <td>{CAT_LABEL[p.category] ?? p.category}</td>
                      <td className="td-price">¥{p.price.toLocaleString('ja-JP')}</td>
                      <td className="td-mono">{p.stock_count}</td>
                      <td>
                        <StatusToggle id={p.id} status={p.status} />
                      </td>
                      <td>
                        <FeaturedToggle id={p.id} featured={p.featured} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Link href={`/products/${p.id}`} className="btn btn-ghost btn-sm">編集</Link>
                          <DeleteButton id={p.id} name={p.name} />
                        </div>
                      </td>
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

function PlusIcon() { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/></svg> }
