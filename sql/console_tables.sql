-- ============================================================
-- CIELO SHOP CONSOLE — 管理画面用テーブル追加
-- Supabase SQL Editor で実行してください
-- ============================================================

-- order_status ENUM
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- customers
CREATE TABLE IF NOT EXISTS customers (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  email        TEXT        UNIQUE NOT NULL,
  phone        TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city         TEXT,
  postal_code  TEXT,
  prefecture   TEXT,
  country      TEXT        DEFAULT 'JP',
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- orders
CREATE TABLE IF NOT EXISTS orders (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id        TEXT         UNIQUE,
  stripe_payment_intent_id TEXT         UNIQUE,
  status                   order_status NOT NULL DEFAULT 'pending',
  subtotal                 INTEGER      NOT NULL DEFAULT 0,
  tax                      INTEGER      NOT NULL DEFAULT 0,
  total                    INTEGER      NOT NULL DEFAULT 0,
  currency                 TEXT         NOT NULL DEFAULT 'jpy',
  customer_name            TEXT,
  customer_email           TEXT,
  customer_id              UUID         REFERENCES customers(id),
  shipping_address         JSONB,
  tracking_number          TEXT,
  notes                    TEXT,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- order_items
CREATE TABLE IF NOT EXISTS order_items (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id     UUID        REFERENCES products(id),
  variant_id     UUID        REFERENCES product_variants(id),
  product_name   TEXT        NOT NULL,
  product_slug   TEXT,
  variant_label  TEXT,
  unit_price     INTEGER     NOT NULL,
  quantity       INTEGER     NOT NULL DEFAULT 1,
  subtotal       INTEGER     NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at trigger for orders
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_set_updated_at ON orders;
CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_email      ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_created    ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_customers_email   ON customers(email);

-- RLS (service_role key でアクセスするため特別なポリシー不要)
ALTER TABLE customers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 管理者のみ全操作可（service_role key 経由でRLSバイパス）
-- 公開なし（匿名アクセス不可）
