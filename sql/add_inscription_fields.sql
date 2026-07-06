-- ============================================================
-- CIELO SHOP CONSOLE — 刻印機能マイグレーション
-- Supabase SQL Editor で実行してください
-- 既存テーブルへの追加のみ。何度実行しても安全。
-- ============================================================

-- products: 刻印設定フィールド
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS engraving_available          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS engraving_required           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS engraving_max_chars          INTEGER  NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS inscription_available_types  TEXT[]   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS inscription_location         TEXT     DEFAULT NULL;

COMMENT ON COLUMN products.engraving_available         IS '刻印オプション対応商品の場合 true';
COMMENT ON COLUMN products.engraving_required          IS '刻印必須の場合 true (engraving_available=true 前提)';
COMMENT ON COLUMN products.engraving_max_chars         IS '刻印最大文字数 (デフォルト: 20文字)';
COMMENT ON COLUMN products.inscription_available_types IS '利用可能な刻印タイプ。NULL=全タイプ。例: {initials,name,date,short_message}';
COMMENT ON COLUMN products.inscription_location        IS '刻印場所。例: インナータグ / バックプレート / リング内側';

-- orders: 配送先氏名・電話番号
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_name  TEXT,
  ADD COLUMN IF NOT EXISTS shipping_phone TEXT;

COMMENT ON COLUMN orders.shipping_name  IS 'Stripe checkout の配送先氏名';
COMMENT ON COLUMN orders.shipping_phone IS 'Stripe checkout の電話番号';

-- order_items: 刻印フィールド
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS engraving_type       TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS engraving_text       TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS inscription_location TEXT DEFAULT NULL;

COMMENT ON COLUMN order_items.engraving_type       IS '刻印タイプ: initials / name / date / short_message / NULL=刻印なし';
COMMENT ON COLUMN order_items.engraving_text       IS '刻印内容。NULL = 刻印なし。';
COMMENT ON COLUMN order_items.inscription_location IS '注文時点の刻印場所スナップショット';

-- 確認クエリ
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('products', 'orders', 'order_items')
  AND column_name IN (
    'engraving_available', 'engraving_required', 'engraving_max_chars',
    'inscription_available_types', 'inscription_location',
    'shipping_name', 'shipping_phone',
    'engraving_type', 'engraving_text'
  )
ORDER BY table_name, column_name;
