'use client'
import { toggleProductStatus, toggleProductFeatured, deleteProduct } from '@/actions/products'

export function StatusToggle({ id, status }) {
  return (
    <form action={toggleProductStatus.bind(null, id, status)}>
      <button className={`badge badge-${status}`} type="submit" title="クリックで切替">
        {status === 'active' ? '公開中' : status === 'draft' ? '下書き' : 'アーカイブ'}
      </button>
    </form>
  )
}

export function FeaturedToggle({ id, featured }) {
  return (
    <form action={toggleProductFeatured.bind(null, id, featured)}>
      <button
        type="submit"
        style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', opacity: featured ? 1 : 0.25 }}
        title="注目商品トグル"
      >
        ★
      </button>
    </form>
  )
}

export function DeleteButton({ id, name }) {
  return (
    <form
      action={deleteProduct.bind(null, id)}
      onSubmit={e => { if (!confirm(`「${name}」を削除しますか？`)) e.preventDefault() }}
    >
      <button type="submit" className="btn btn-danger btn-sm">削除</button>
    </form>
  )
}
