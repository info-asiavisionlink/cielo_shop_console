-- ============================================================
-- CIELO — hero_slides テーブル
-- CIELO CONSOLEからヒーロースライダーを管理するためのテーブル
-- 実行前提: trigger_set_updated_at() 関数が存在すること
-- ============================================================

CREATE TABLE IF NOT EXISTS hero_slides (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT,
  subtitle          TEXT,
  eyebrow_label     TEXT,
  desktop_image_url TEXT,
  mobile_image_url  TEXT,
  media_type        TEXT         NOT NULL DEFAULT 'image', -- 'image' | 'video'
  video_url         TEXT,
  overlay_opacity   NUMERIC(3,2) NOT NULL DEFAULT 0.65 CHECK (overlay_opacity >= 0 AND overlay_opacity <= 1),
  text_position     TEXT         NOT NULL DEFAULT 'center', -- 'left' | 'center' | 'right'
  cta_label         TEXT,
  cta_link          TEXT,
  display_order     INTEGER      NOT NULL DEFAULT 0,
  is_active         BOOLEAN      NOT NULL DEFAULT true,
  start_date        DATE,
  end_date          DATE,
  transition_duration INTEGER    NOT NULL DEFAULT 1200,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hero_slides_order  ON hero_slides(display_order);
CREATE INDEX IF NOT EXISTS idx_hero_slides_active ON hero_slides(is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS hero_slides_set_updated_at ON hero_slides;
CREATE TRIGGER hero_slides_set_updated_at
  BEFORE UPDATE ON hero_slides
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_active_hero_slides" ON hero_slides;
CREATE POLICY "public_select_active_hero_slides"
  ON hero_slides FOR SELECT
  USING (
    is_active = true
    AND (start_date IS NULL OR start_date <= CURRENT_DATE)
    AND (end_date   IS NULL OR end_date   >= CURRENT_DATE)
  );

COMMENT ON TABLE  hero_slides                    IS 'CIELO SHOP Heroをコンソールから管理するテーブル';
COMMENT ON COLUMN hero_slides.media_type         IS '''image'' または ''video''';
COMMENT ON COLUMN hero_slides.overlay_opacity    IS '0〜1の範囲。デフォルト: 0.65';
COMMENT ON COLUMN hero_slides.text_position      IS '''left'' | ''center'' | ''right''';
COMMENT ON COLUMN hero_slides.transition_duration IS 'クロスフェードアニメーション時間(ms)';
