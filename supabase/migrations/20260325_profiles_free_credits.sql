-- Pro 無料枠（free_credits）と互換フラグ
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS free_credits integer NOT NULL DEFAULT 1;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS has_used_pro_trial boolean NOT NULL DEFAULT false;

-- 既存行で free_credits 未設定相当を補正（DEFAULT で埋まるが明示）
UPDATE profiles
SET free_credits = 1
WHERE free_credits IS NULL;

UPDATE profiles
SET free_credits = 0,
    has_used_pro_trial = true
WHERE has_used_pro_trial = true
  AND free_credits > 0;
