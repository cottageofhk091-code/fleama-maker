-- analytics_visits に流入元カテゴリ列を追加（Supabase SQL Editor でも可）
ALTER TABLE analytics_visits
  ADD COLUMN IF NOT EXISTS source_category text;
