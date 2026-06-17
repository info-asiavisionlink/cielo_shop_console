'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createProduct, getTags } from '@/actions/products'

export default function NewProductPage() {
  const router  = useRouter()
  const [error,  setError]  = useState('')
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
          <div style={{ marginTop: 28, display: 'flex', gap: 10, paddingBottom: 48 }}>
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

/* ═══════════════════════════════════════════════════════════
   ProductForm — 新規・編集 共用コンポーネント
   product: getProduct() の返り値（編集時）
═══════════════════════════════════════════════════════════ */
export function ProductForm({ product }) {
  const [category, setCategory] = useState(product?.category || '')
  const [featured, setFeatured] = useState(product?.featured ?? false)
  const [attrs,    setAttrs]    = useState(product?.attributes || {})

  // ── 画像 (最大5枚) ──
  const initImages = () => {
    const imgs = (product?.product_images || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .slice(0, 5)
      .map(i => ({ url: i.image_url, alt: i.alt_text || '' }))
    while (imgs.length < 5) imgs.push({ url: '', alt: '' })
    return imgs
  }
  const [images, setImages] = useState(initImages)

  // ── バリアント ──
  const [variants, setVariants] = useState(
    (product?.product_variants || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(v => ({ sku: v.sku, type: v.type, label: v.label, label_ja: v.label_ja || '', stock_count: v.stock_count, price_modifier: v.price_modifier }))
  )

  // ── タグ ──
  const [allTags,      setAllTags]      = useState([])
  const [selectedTags, setSelectedTags] = useState(
    (product?.product_tags || []).map(pt => ({ id: pt.tags.id, name: pt.tags.name, name_ja: pt.tags.name_ja || '' }))
  )
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    getTags().then(setAllTags).catch(() => {})
  }, [])

  /* ── helpers ── */
  function setAttr(key, value) { setAttrs(prev => ({ ...prev, [key]: value })) }

  function setImage(i, field, value) {
    setImages(prev => prev.map((img, idx) => idx === i ? { ...img, [field]: value } : img))
  }

  function toggleTag(tag) {
    setSelectedTags(prev => {
      const exists = prev.find(t => t.id === tag.id)
      return exists ? prev.filter(t => t.id !== tag.id) : [...prev, tag]
    })
  }

  function addCustomTag() {
    const name = tagInput.trim()
    if (!name) return
    const existing = allTags.find(t => t.name === name.toLowerCase())
    if (existing) { toggleTag(existing); setTagInput(''); return }
    const already  = selectedTags.find(t => t.name === name.toLowerCase())
    if (already) { setTagInput(''); return }
    setSelectedTags(prev => [...prev, { id: null, name: name.toLowerCase(), name_ja: '' }])
    setTagInput('')
  }

  function removeTag(name) {
    setSelectedTags(prev => prev.filter(t => t.name !== name))
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
      {/* ─ JSON hidden inputs ─ */}
      <input type="hidden" name="attributes_json" value={JSON.stringify(attrs)} />
      <input type="hidden" name="variants_json"   value={JSON.stringify(variants)} />
      <input type="hidden" name="images_json"     value={JSON.stringify(images)} />
      <input type="hidden" name="tags_json"        value={JSON.stringify(selectedTags)} />

      {/* ══ 基本情報 ══ */}
      <div className="form-section">
        <div className="form-section-title">基本情報</div>
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
              className="form-select" name="category"
              value={category}
              onChange={e => { setCategory(e.target.value); setAttrs({}) }}
              required
            >
              <option value="" disabled>選択してください</option>
              <option value="jewelry">Jewelry（ジュエリー）</option>
              <option value="apparel">Apparel（アパレル）</option>
              <option value="art">Art（アート）</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">サブカテゴリ</label>
            <input className="form-input" name="subcategory" defaultValue={product?.subcategory}
              placeholder="necklace / ring / tshirt / print ..." />
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

      {/* ══ 商品画像（最大5枚） ══ */}
      <div className="form-section">
        <div className="form-section-title">
          商品画像
          <span className="form-hint" style={{ marginLeft: 8 }}>1枚目がサムネイルになります</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {images.map((img, i) => (
            <ImageSlot
              key={i}
              index={i}
              value={img.url}
              alt={img.alt}
              isThumbnail={i === 0}
              onChange={(url, alt) => { setImage(i, 'url', url); if (alt !== undefined) setImage(i, 'alt', alt) }}
            />
          ))}
        </div>
      </div>

      {/* ══ 価格・在庫 ══ */}
      <div className="form-section">
        <div className="form-section-title">価格・在庫</div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">価格（税込・JPY）*</label>
            <input className="form-input" name="price" type="number" min="0" defaultValue={product?.price ?? 0} required />
          </div>
          <div className="form-group">
            <label className="form-label">在庫数</label>
            <input className="form-input" name="stock_count" type="number" min="0" defaultValue={product?.stock_count ?? 0} />
            <span className="form-hint">バリアントを使う場合はバリアント側で管理</span>
          </div>
          <div className="form-group form-col-2">
            <label className="form-label" style={{ marginBottom: 10 }}>注目商品（Featured）</label>
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

      {/* ══ カテゴリ別属性 ══ */}
      {category === 'jewelry' && (
        <div className="form-section">
          <div className="form-section-title">Jewelry 仕様</div>
          <div className="form-grid">
            {[
              ['material',      '素材',             '925 Sterling Silver'],
              ['stone_type',    '石種',             'Moissanite / Diamond'],
              ['metal_color',   'カラー（メタル）', 'Silver / Gold / Rose Gold'],
              ['stone_color',   'カラー（石）',     'D Color'],
              ['stone_size_ct', 'サイズ（ct）',     '1.0ct'],
              ['stone_clarity', 'クラリティ',       'VVS1'],
              ['setting',       'セッティング',     'Solitaire'],
            ].map(([key, label, ph]) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                <input className="form-input" type="text" value={attrs[key] || ''} onChange={e => setAttr(key, e.target.value)} placeholder={ph} />
              </div>
            ))}
          </div>
        </div>
      )}

      {category === 'apparel' && (
        <div className="form-section">
          <div className="form-section-title">Apparel 仕様</div>
          <div className="form-grid">
            {[
              ['material',          '素材',         '100% Cotton'],
              ['color',             'カラー',        'Black / White / Navy'],
              ['print_method',      'プリント方法', 'DTG / Screen Print'],
              ['country_of_origin', '原産国',       'Japan'],
            ].map(([key, label, ph]) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                <input className="form-input" type="text" value={attrs[key] || ''} onChange={e => setAttr(key, e.target.value)} placeholder={ph} />
              </div>
            ))}
            <div className="form-hint" style={{ gridColumn: '1 / -1' }}>
              サイズ（S/M/L）はバリアントセクションで登録してください
            </div>
          </div>
        </div>
      )}

      {category === 'art' && (
        <div className="form-section">
          <div className="form-section-title">Art 仕様</div>
          <div className="form-grid">
            {[
              ['art_size',      '作品サイズ',   'A2 / 60×90cm'],
              ['edition_total', '限定数',       '50'],
              ['serial_number', 'シリアル番号', '1/50'],
              ['medium',        'メディウム',   'Digital Print / Oil on Canvas'],
            ].map(([key, label, ph]) => (
              <div className="form-group" key={key}>
                <label className="form-label">{label}</label>
                <input className="form-input" type="text" value={attrs[key] || ''} onChange={e => setAttr(key, e.target.value)} placeholder={ph} />
              </div>
            ))}
            <div className="form-group form-col-2">
              <label className="form-label" style={{ marginBottom: 8 }}>オプション</label>
              <div style={{ display: 'flex', gap: 20 }}>
                {[['signed','サイン入り'],['framed','額装'],['certificate','証明書付']].map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={!!attrs[key]} onChange={e => setAttr(key, e.target.checked)} style={{ width: 14, height: 14 }} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ 説明文 ══ */}
      <div className="form-section">
        <div className="form-section-title">説明文</div>
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
            <textarea className="form-textarea" name="story" defaultValue={product?.story} rows={2} placeholder="The light you deserve." />
          </div>
          <div className="form-group">
            <label className="form-label">ブランドコピー（日）</label>
            <textarea className="form-textarea" name="story_ja" defaultValue={product?.story_ja} rows={2} />
          </div>
          <div className="form-group">
            <label className="form-label">OGP画像URL</label>
            <input className="form-input" name="og_image_url" defaultValue={product?.og_image_url} placeholder="https://..." />
          </div>
        </div>
      </div>

      {/* ══ タグ ══ */}
      <div className="form-section">
        <div className="form-section-title">タグ</div>
        {/* 選択済みチップ */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {selectedTags.map(t => (
            <span key={t.name} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 20,
              background: t.id ? 'var(--gold)' : '#4a90d9',
              color: '#fff', fontSize: 12, fontWeight: 600,
            }}>
              {t.name_ja || t.name}
              <button type="button" onClick={() => removeTag(t.name)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, lineHeight: 1, fontSize: 14 }}>
                ×
              </button>
            </span>
          ))}
          {selectedTags.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>タグ未設定</span>}
        </div>

        {/* 既存タグ一覧 */}
        {allTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {allTags.map(t => {
              const selected = !!selectedTags.find(s => s.id === t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t)}
                  style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                    border: '1px solid var(--border)',
                    background: selected ? 'var(--gold)' : 'transparent',
                    color: selected ? '#fff' : 'var(--text-2)',
                    fontWeight: selected ? 600 : 400,
                  }}
                >
                  {t.name_ja || t.name}
                </button>
              )
            })}
          </div>
        )}

        {/* 新規タグ入力 */}
        <div style={{ display: 'flex', gap: 8, maxWidth: 360 }}>
          <input
            className="form-input"
            placeholder="新しいタグを入力（例: モアサナイト）"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }}
            style={{ fontSize: 13 }}
          />
          <button type="button" className="btn btn-ghost btn-sm" onClick={addCustomTag}>追加</button>
        </div>
        <span className="form-hint">Enterまたは「追加」でタグを追加。金色=既存タグ、青=新規作成</span>
      </div>

      {/* ══ バリアント ══ */}
      <div className="form-section">
        <div className="form-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>バリアント（サイズ・カラー・長さ等）</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={addVariant}>+ バリアント追加</button>
        </div>
        {variants.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: 13 }}>バリアントなし（在庫数は上の「在庫数」フィールドを使用）</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 70px 90px 90px 36px', gap: 6, fontSize: 11, color: 'var(--text-3)', padding: '0 2px' }}>
              <span>ラベル（英）</span><span>ラベル（日）</span><span>タイプ</span><span>在庫</span><span>追加料金</span><span>SKU</span><span />
            </div>
            {variants.map((v, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 70px 90px 90px 36px', gap: 6, alignItems: 'center' }}>
                <input className="form-input" placeholder="40cm / Black M" value={v.label} onChange={e => updateVariant(i,'label',e.target.value)} style={{ fontSize: 12 }} />
                <input className="form-input" placeholder="40センチ" value={v.label_ja} onChange={e => updateVariant(i,'label_ja',e.target.value)} style={{ fontSize: 12 }} />
                <select className="form-select" value={v.type} onChange={e => updateVariant(i,'type',e.target.value)} style={{ fontSize: 12 }}>
                  <option value="size">size</option>
                  <option value="color_size">color_size</option>
                  <option value="length">length</option>
                  <option value="frame">frame</option>
                </select>
                <input className="form-input" type="number" min="0" value={v.stock_count} onChange={e => updateVariant(i,'stock_count',e.target.value)} style={{ fontSize: 12 }} />
                <input className="form-input" type="number" value={v.price_modifier} onChange={e => updateVariant(i,'price_modifier',e.target.value)} style={{ fontSize: 12 }} />
                <input className="form-input" placeholder="省略可" value={v.sku} onChange={e => updateVariant(i,'sku',e.target.value)} style={{ fontSize: 12 }} />
                <button type="button" onClick={() => removeVariant(i)}
                  style={{ background: 'none', border: 'none', color: 'var(--danger,#e53e3e)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════
   ImageSlot — 1枚ごとの画像スロット（Supabase Storage へアップロード）
   アップロード前にCanvasでWebP変換・最大1200px・品質85%に圧縮
═══════════════════════════════════════════════════════════ */

function ImageSlot({ index, value, alt, isThumbnail, onChange }) {
  const inputRef   = useRef()
  const [uploading, setUploading] = useState(false)
  const [progress,  setProgress]  = useState('')
  const [error,     setError]     = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      setProgress('アップロード中…')
      const cloudName    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
      if (!cloudName || !uploadPreset) throw new Error('Cloudinary 環境変数が未設定です')

      const fd = new FormData()
      fd.append('file', file)
      fd.append('upload_preset', uploadPreset)
      fd.append('folder', 'products')
      // Cloudinary側で自動WebP変換・最適化するため f_auto,q_auto を付与
      fd.append('transformation', 'f_auto,q_auto,w_1200')

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: fd }
      )
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message || 'Upload failed')

      // f_auto,q_auto で最適化されたURLを保存
      const url = json.secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_1200/')
      onChange(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      setProgress('')
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          width: '100%', aspectRatio: '1', borderRadius: 8, overflow: 'hidden',
          border: `2px ${value ? 'solid var(--gold)' : 'dashed var(--border)'}`,
          background: 'var(--bg-2, #1a1a1a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: uploading ? 'wait' : 'pointer', position: 'relative',
        }}
      >
        {value ? (
          <>
            <img src={value} alt={alt || `画像${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div
              onClick={e => { e.stopPropagation(); onChange('') }}
              style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, cursor: 'pointer' }}
            >×</div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
            {uploading ? (
              <span style={{ fontSize: 11 }}>{progress || 'アップロード中…'}</span>
            ) : (
              <>
                <div style={{ fontSize: 24, marginBottom: 4 }}>＋</div>
                <div>画像{index + 1}{isThumbnail ? '（サムネイル）' : ''}</div>
              </>
            )}
          </div>
        )}
      </div>
      {error && <div style={{ fontSize: 10, color: '#e53e3e', wordBreak: 'break-all' }}>{error}</div>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}
