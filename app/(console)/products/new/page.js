'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createProduct } from '@/actions/products'

export default function NewProductPage() {
  const router  = useRouter()
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const fd = new FormData(e.currentTarget)
      await createProduct(fd)
      router.push('/products')
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">商品追加</h1>
          <p className="page-sub">新しい商品を登録します</p>
        </div>
        <div className="page-actions">
          <Link href="/products" className="btn btn-ghost">キャンセル</Link>
        </div>
      </div>
      <div className="page-content">
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <ProductForm />
          <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? '保存中...' : '商品を登録'}
            </button>
            <Link href="/products" className="btn btn-ghost">キャンセル</Link>
          </div>
        </form>
      </div>
    </>
  )
}

export function ProductForm({ product }) {
  const [featured, setFeatured] = useState(product?.featured ?? false)

  return (
    <>
      {/* Basic Info */}
      <div className="form-section">
        <div className="form-section-title">Basic Info</div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">商品名（英）*</label>
            <input className="form-input" name="name" defaultValue={product?.name} required placeholder="CIELO Moissanite Necklace" />
          </div>
          <div className="form-group">
            <label className="form-label">商品名（日）</label>
            <input className="form-input" name="name_ja" defaultValue={product?.name_ja} placeholder="シエロ モアサナイトネックレス" />
          </div>
          <div className="form-group">
            <label className="form-label">スラッグ *</label>
            <input className="form-input" name="slug" defaultValue={product?.slug} placeholder="moissanite-necklace-001（空欄で自動生成）" />
          </div>
          <div className="form-group">
            <label className="form-label">カテゴリ *</label>
            <select className="form-select" name="category" defaultValue={product?.category || ''} required>
              <option value="" disabled>選択してください</option>
              <option value="jewelry">Jewelry</option>
              <option value="apparel">Apparel</option>
              <option value="art">Art</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">サブカテゴリ</label>
            <input className="form-input" name="subcategory" defaultValue={product?.subcategory} placeholder="necklace / ring / tshirt / pop_culture ..." />
          </div>
          <div className="form-group">
            <label className="form-label">ステータス</label>
            <select className="form-select" name="status" defaultValue={product?.status || 'draft'}>
              <option value="draft">下書き（非公開）</option>
              <option value="active">公開中</option>
              <option value="archived">アーカイブ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pricing & Stock */}
      <div className="form-section">
        <div className="form-section-title">Pricing &amp; Stock</div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">価格（税込・JPY）*</label>
            <input className="form-input" name="price" type="number" min="0" defaultValue={product?.price ?? 0} required />
          </div>
          <div className="form-group">
            <label className="form-label">在庫数</label>
            <input className="form-input" name="stock_count" type="number" min="0" defaultValue={product?.stock_count ?? 0} />
          </div>
          <div className="form-group form-col-2">
            <label className="form-label" style={{ marginBottom: 10 }}>注目商品</label>
            <div className="toggle-wrap">
              <label className="toggle">
                <input
                  type="checkbox"
                  name="featured"
                  value="true"
                  checked={featured}
                  onChange={e => setFeatured(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
              <span className="toggle-label">トップページのFeaturedに表示</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="form-section">
        <div className="form-section-title">Description</div>
        <div className="form-grid single">
          <div className="form-group">
            <label className="form-label">説明（英）</label>
            <textarea className="form-textarea" name="description" defaultValue={product?.description} rows={4} />
          </div>
          <div className="form-group">
            <label className="form-label">説明（日）</label>
            <textarea className="form-textarea" name="description_ja" defaultValue={product?.description_ja} rows={4} />
          </div>
          <div className="form-group">
            <label className="form-label">ブランドコピー（英）</label>
            <textarea className="form-textarea" name="story" defaultValue={product?.story} rows={3} placeholder="The light you deserve." />
          </div>
          <div className="form-group">
            <label className="form-label">ブランドコピー（日）</label>
            <textarea className="form-textarea" name="story_ja" defaultValue={product?.story_ja} rows={3} />
          </div>
        </div>
      </div>

      {/* Image */}
      <div className="form-section">
        <div className="form-section-title">Thumbnail Image</div>
        <div className="form-grid single">
          <div className="form-group">
            <label className="form-label">サムネイル画像URL</label>
            <input
              className="form-input"
              name="image_url"
              defaultValue={product?.product_images?.find(i => i.is_thumbnail)?.image_url || ''}
              placeholder="https://res.cloudinary.com/..."
            />
            <span className="form-hint">Cloudinary などの画像URLを貼り付けてください</span>
          </div>
          <div className="form-group">
            <label className="form-label">OGP画像URL</label>
            <input className="form-input" name="og_image_url" defaultValue={product?.og_image_url} placeholder="https://..." />
          </div>
        </div>
      </div>
    </>
  )
}
