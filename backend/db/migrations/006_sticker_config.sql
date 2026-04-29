-- Sticker design customisation per org (US-056)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sticker_config JSONB NOT NULL DEFAULT '{}';
