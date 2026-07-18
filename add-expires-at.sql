-- Execute este script no Supabase SQL Editor:
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expires_at timestamptz;
