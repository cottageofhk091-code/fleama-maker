-- ============================================================
-- Pro 無料枠: profiles.free_credits / has_used_pro_trial
-- Supabase Dashboard → SQL Editor でこのファイルを実行してください
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS has_used_pro_trial boolean NOT NULL DEFAULT false;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS free_credits integer;

ALTER TABLE profiles
  ALTER COLUMN free_credits SET DEFAULT 1;

-- 未消費ユーザーの NULL → 1
UPDATE profiles
SET free_credits = 1
WHERE free_credits IS NULL
  AND COALESCE(has_used_pro_trial, false) = false;

-- 消費済みフラグと整合
UPDATE profiles
SET free_credits = 0,
    has_used_pro_trial = true
WHERE COALESCE(has_used_pro_trial, false) = true
  AND (free_credits IS NULL OR free_credits > 0);

-- 新規行は必ず 1
ALTER TABLE profiles
  ALTER COLUMN free_credits SET DEFAULT 1;

UPDATE profiles
SET free_credits = 1
WHERE free_credits IS NULL;

ALTER TABLE profiles
  ALTER COLUMN free_credits SET NOT NULL;
