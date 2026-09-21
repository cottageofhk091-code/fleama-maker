-- Pro 1回お試し用カラム（Supabase SQL Editor で実行）
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS has_used_pro_trial boolean NOT NULL DEFAULT false;
