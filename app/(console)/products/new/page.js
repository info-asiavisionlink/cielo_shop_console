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

/* ─────────────────────────────────────────────────
   ProductForm — 新規・編集 共用コンポーネント
───────────────────────────────────────────────── */
export function ProductForm({ product }) {
  const [category, setCategory] = useState(product?.category || '')
  const [featured, setFeatured] = useState(product?.featured ?? false)
  const [attrs,    setAttrs]    = useState(product?.attributes || {})
  const [variants, setVariants] = useState(
    (product?.product_variants || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(v => ({ sku: v.sku, type: v.type, label: v.label, label_ja: v.label_ja || '', stock_count: v.stock_count, price_modifier: v.price_modifier }))
  )

  function setAttr(key, value) {
    setAttrs(prev => ({ ...prev, [key]: value }))
  }

  function addVariant() {
    setVariants(v => [...v, { sku: '', type: 'size', label: '', label_ja: '', stock_count: 0, price_modifier: 0 }])
  }
  function updateVariant(i, field, value) {
    setVariants(v => v.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }
  function removeVariant(i) {
    setVariants(v => v.filter((_, idx) => idx !== i))
  }

  return (
    <>
      {/* Hidden: attributes & variants JSON */}
      <input type="hidden" name="attributes_json" value={JSON.stringify(attrs)} />
      <input type="hidden" name="variants_json"   value={JSON.stringify(variants)} />

      {/* ── Basic Info ── */}
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
            <label className="form-label">スラッグ</label>
            <input className="form-input" name="slug" defaultValue={product?.slug} placeholder="空欄で自動生成" />
          </div>
          <div className="form-group">
            <label className="form-label">カテゴリ *</label>
            <select
              className="form-select"
              name="category"
              value={category}
              onChange={e => { setCategory(e.target.value); setAttrs({}) }}
              required
            >
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

      {/* ── Pricing & Stock ── */}
      <div className="form-section">
        <div className="form-section-title">Pricing &amp; Stock</div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">価格（税込・JPY）*</label>
            <input className="form-input" name="price" type="number" min="0" defaultValue={product?.price ?? 0} required />
          </div>
          <div className="form-group">
            <label className="form-label">在庫数（バリアントなしの場合）</label>
            <input className="form-input" name="stock_count" type="number" min="0" defaultValue={product?.stock_count ?? 0} />
          </div>
          <div className="form-group form-col-2">
            <label className="form-label" style={{ marginBottom: 10 }}>注目商品</label>
            <div className="toggle-wrap">
              <label className="toggle">
                <input type="checkbox" name="featured" value="true" checked={featured} onChange={e => setFeatured(e.target.checked)} />
                <span className="toggle-slider" />
              </label>
              <span className="toggle-label">トップページのFeaturedに表示</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Attributes（カテゴリ別） ── */}
      {category === 'jewelry' && (
        <div className="form-section">
          <div className="form-section-title">Jewelry Specs</div>
          <div className="form-grid">
            {[
              ['material',       '素材',        'text', '925 Sterling Silver'],
              ['metal_color',    'メタルカラー', 'text', 'Silver / Gold / Rose Gold'],
              ['stone_type',     '石の種類',    'text', 'Moissanite'],
              ['stone_size_ct',  'ストーンサイズ', 'text', '1.0ct'],
              ['stone_color',    'ストーンカラー', 'text', 'D Color'],
              ['stone_clarity',  'クラリティ',  'text', 'VVS1'],
              ['setting',        'セッティング', 'text', 'Solitaire'],
            ].map(([key, label, , ph]) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                <input
                  className="form-input"
                  type="text"
                  value={attrs[key] || ''}
                  onChange={e => setAttr(key, e.target.value)}
                  placeholder={ph}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {category === 'apparel' && (
        <div className="form-section">
          <div className="form-section-title">Apparel Specs</div>
          <div className="form-grid">
            {[
              ['material',          '素材',         '100% Cotton'],
              ['print_method',      'プリント方法', 'DTG / Screen Print / Embroidery'],
              ['country_of_origin', '原産国',       'Japan'],
            ].map(([key, label, ph]) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                <input
                  className="form-input"
                  type="text"
                  value={attrs[key] || ''}
                  onChange={e => setAttr(key, e.target.value)}
                  placeholder={ph}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {category === 'art' && (
        <div className="form-section">
          <div className="form-section-title">Art Specs</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">メディウム</label>
              <input className="form-input" type="text" value={attrs.medium || ''} onChange={e => setAttr('medium', e.target.value)} placeholder="Digital Print" />
            </div>
            <div className="form-group">
              <label className="form-label">エディション番号</label>
              <input className="form-input" type="text" value={attrs.edition || ''} onChange={e => setAttr('edition', e.target.value)} placeholder="1" />
            </div>
            <div className="form-group">
              <label className="form-label">エディション総数</label>
              <input className="form-input" type="text" value={attrs.edition_total || ''} onChange={e => setAttr('edition_total', e.target.value)} placeholder="50" />
            </div>
            <div className="form-group form-col-2">
              <label className="form-label" style={{ marginBottom: 8 }}>オプション</label>
              <div style={{ display: 'flex', gap: 20 }}>
                {[['signed','サイン入り'],['framed','額装'],['certificate','証明書付']].map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={!!attrs[key]}
                      onChange={e => setAttr(key, e.target.checked)}
                      style={{ width: 14, height: 14 }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Description ── */}
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

      {/* ── Images ── */}
      <div className="form-section">
        <div className="form-section-title">Images</div>
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

      {/* ── Variants ── */}
      <div className="form-section">
        <div className="form-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Variants（バリアント）</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={addVariant}>+ バリアント追加</button>
        </div>
        <span className="form-hint" style={{ display: 'block', marginBottom: 12 }}>
          サイズ・カラー・長さなど。バリアントがある場合は在庫数をここで管理します。
        </span>

        {variants.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: 13, padding: '12px 0' }}>バリアントなし（上の在庫数を使用）</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {variants.map((v, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px 90px 90px 36px', gap: 6, alignItems: 'center' }}>
                <input
                  className="form-input"
                  placeholder="ラベル（例: 40cm）"
                  value={v.label}
                  onChange={e => updateVariant(i, 'label', e.target.value)}
                  style={{ fontSize: 12 }}
                />
                <input
                  className="form-input"
                  placeholder="ラベル（日）"
                  value={v.label_ja}
                  onChange={e => updateVariant(i, 'label_ja', e.target.value)}
                  style={{ fontSize: 12 }}
                />
                <select
                  className="form-select"
                  value={v.type}
                  onChange={e => updateVariant(i, 'type', e.target.value)}
                  style={{ fontSize: 12 }}
                >
                  <option value="size">size</option>
                  <option value="color_size">color_size</option>
                  <option value="length">length</option>
                  <option value="frame">frame</option>
                </select>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  placeholder="在庫"
                  value={v.stock_count}
                  onChange={e => updateVariant(i, 'stock_count', e.target.value)}
                  style={{ fontSize: 12 }}
                />
                <input
                  className="form-input"
                  type="number"
                  placeholder="追加料金"
                  value={v.price_modifier}
                  onChange={e => updateVariant(i, 'price_modifier', e.target.value)}
                  style={{ fontSize: 12 }}
                />
                <input
                  className="form-input"
                  placeholder="SKU（省略可）"
                  value={v.sku}
                  onChange={e => updateVariant(i, 'sku', e.target.value)}
                  style={{ fontSize: 12 }}
                />
                <button
                  type="button"
                  onClick={() => removeVariant(i)}
                  style={{ background: 'none', border: 'none', color: 'var(--danger, #e53e3e)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}
                  title="削除"
                >×</button>
              </div>
            ))}
            <div style={{ fontSize: 11, color: 'var(--text-3)', paddingTop: 4 }}>
              列: ラベル（英） / ラベル（日） / タイプ / 在庫数 / 追加料金（JPY） / SKU
            </div>
          </div>
        )}
      </div>
    </>
  )
}
