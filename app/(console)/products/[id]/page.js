'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { getProduct, updateProduct } from '@/actions/products'
import { ProductForm } from '../new/page'

export default function EditProductPage() {
  const router  = useRouter()
  const { id }  = useParams()
  const [product, setProduct] = useState(null)
  const [error,   setError]   = useState('')
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    getProduct(id).then(setProduct).catch(e => setError(e.message))
  }, [id])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const fd = new FormData(e.currentTarget)
      await updateProduct(id, fd)
      router.push('/products')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  if (!product && !error) {
    return (
      <div className="page-content" style={{ textAlign: 'center', paddingTop: 80, color: 'var(--text-3)' }}>
        読み込み中...
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">商品編集</h1>
          <p className="page-sub">{product?.name}</p>
        </div>
        <div className="page-actions">
          <Link href="/products" className="btn btn-ghost">← 一覧に戻る</Link>
        </div>
      </div>
      <div className="page-content">
        {error && <div className="alert alert-error">{error}</div>}
        {product && (
          <form onSubmit={handleSubmit}>
            <ProductForm product={product} />
            <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? '保存中...' : '変更を保存'}
              </button>
              <Link href="/products" className="btn btn-ghost">キャンセル</Link>
            </div>
          </form>
        )}
      </div>
    </>
  )
}
