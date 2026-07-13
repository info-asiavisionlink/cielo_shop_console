import { getProducts } from '@/actions/products'
import { StatusToggle, FeaturedToggle, DeleteButton } from './_interactive'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

// CIELO. = Apparel専用
// RTL.(jewelry) / VOID.(art) / MIRAI. は別コンソールで管理予定
const CAT_LABEL = { jewelry: 'Accessories', apparel: 'Apparel', art: 'Art' }

const SUBCATS = {
  apparel: [
    { value: 'tshirt',     label: 'Tシャツ' },
    { value: 'longtshirt', label: 'ロングTシャツ' },
    { value: 'hoodie',     label: 'パーカー' },
    { value: 'setup',      label: 'セットアップ' },
    { value: 'swimwear',   label: '水着' },
  ],
}

export default async function ProductsPage({ searchParams }) {
  const cat    = searchParams?.cat    || 'all'
  const subcat = searchParams?.subcat || 'all'

  let products = []
  try { products = await getProducts(cat) } catch {}

  // subcatフィルター（クライアント側DB query追加も可だが、件数少ないためクライアント側でフィルタリング）
  const filtered = subcat === 'all'
    ? products
    : products.filter(p => (p.subcategory || '').toLowerCase() === subcat)

  const thumb = p => (p.product_images || []).find(i => i.is_thumbnail) || (p.product_images || [])[0]
  const subcatList = SUBCATS[cat] || []

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">商品</h1>
          <p className="page-sub">全{filtered.length}件</p>
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
          {[['all','すべて'],['apparel','Apparel']].map(([val, label]) => (
            <Link
              key={val}
              href={`/products${val === 'all' ? '' : `?cat=${val}`}`}
              className={`filter-btn${cat === val ? ' active' : ''}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Subcategory Filter */}
        {subcatList.length > 0 && (
          <div className="filter-bar" style={{ paddingTop: 0, borderTop: 'none', gap: 4 }}>
            <Link
              href={`/products?cat=${cat}`}
              className={`filter-btn${subcat === 'all' ? ' active' : ''}`}
              style={{ fontSize: 11, padding: '6px 12px' }}
            >
              すべて
            </Link>
            {subcatList.map(s => (
              <Link
                key={s.value}
                href={`/products?cat=${cat}&subcat=${s.value}`}
                className={`filter-btn${subcat === s.value ? ' active' : ''}`}
                style={{ fontSize: 11, padding: '6px 12px' }}
              >
                {s.label}
              </Link>
            ))}
          </div>
        )}

        <div className="table-wrap">
          {filtered.length === 0 ? (
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
                  <th>ステータス</th>
                  <th>注目</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const img = thumb(p)
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {img ? (
                            <img src={img.image_url} alt={p.name}
                              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, background: '#222' }} />
                          ) : (
                            <div style={{ width: 40, height: 40, background: '#222', borderRadius: 4 }} />
                          )}
                          <div>
                            <div className="td-name">{p.name}</div>
                            {p.subcategory && (
                              <div className="td-mono" style={{ fontSize: 10, opacity: 0.5 }}>{p.subcategory}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>{CAT_LABEL[p.category] ?? p.category}</div>
                        {p.subcategory && (
                          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>
                            {subcatList.find(s => s.value === p.subcategory)?.label || p.subcategory}
                          </div>
                        )}
                      </td>
                      <td className="td-price">¥{p.price.toLocaleString('ja-JP')}</td>
                      <td><StatusToggle id={p.id} status={p.status} /></td>
                      <td><FeaturedToggle id={p.id} featured={p.featured} /></td>
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
