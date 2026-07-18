-- ============================================================
-- MAX AI 2.0 — Supabase Database Schema
-- Execute this SQL in:
--   Supabase Dashboard > Project npskqtsnwqyllslgmoof > SQL Editor
-- ============================================================

-- 1. PROFILES TABLE
-- Stores user profile data linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Usuário',
  email       TEXT,
  plan        TEXT NOT NULL DEFAULT 'Free',
  credit_used INTEGER NOT NULL DEFAULT 0,
  credit_limit INTEGER NOT NULL DEFAULT 100,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own profile
CREATE POLICY "profiles_own_access" ON public.profiles
  FOR ALL
  TO authenticated
  USING ( (SELECT auth.uid()) = id )
  WITH CHECK ( (SELECT auth.uid()) = id );

-- Service role can access all profiles (needed for backend admin operations)
CREATE POLICY "profiles_service_role" ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================

-- 2. CHAT SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id         TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'Nova Conversa',
  model      TEXT NOT NULL DEFAULT 'grok',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_own_access" ON public.chat_sessions
  FOR ALL
  TO authenticated
  USING ( (SELECT auth.uid()) = user_id )
  WITH CHECK ( (SELECT auth.uid()) = user_id );

CREATE POLICY "sessions_service_role" ON public.chat_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id
  ON public.chat_sessions (user_id);

-- ============================================================

-- 3. CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  text        TEXT NOT NULL DEFAULT '',
  attachments TEXT[] DEFAULT '{}',
  media_url   TEXT,
  media_type  TEXT,
  model_name  TEXT,
  status      TEXT NOT NULL DEFAULT 'success',
  progress    INTEGER DEFAULT 100,
  error_msg   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_own_access" ON public.chat_messages
  FOR ALL
  TO authenticated
  USING ( (SELECT auth.uid()) = user_id )
  WITH CHECK ( (SELECT auth.uid()) = user_id );

CREATE POLICY "messages_service_role" ON public.chat_messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id
  ON public.chat_messages (session_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id
  ON public.chat_messages (user_id);

-- ============================================================

-- 4. MEDIA GENERATIONS GALLERY TABLE
-- Stores all successfully completed video/image generations
CREATE TABLE IF NOT EXISTS public.media_generations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id  TEXT,
  message_id  TEXT,
  media_type  TEXT NOT NULL CHECK (media_type IN ('video', 'image')),
  model_name  TEXT NOT NULL,
  prompt      TEXT NOT NULL,
  media_url   TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.media_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "generations_own_access" ON public.media_generations
  FOR ALL
  TO authenticated
  USING ( (SELECT auth.uid()) = user_id )
  WITH CHECK ( (SELECT auth.uid()) = user_id );

CREATE POLICY "generations_service_role" ON public.media_generations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_media_generations_user_id
  ON public.media_generations (user_id);

CREATE INDEX IF NOT EXISTS idx_media_generations_created_at
  ON public.media_generations (created_at DESC);

-- ============================================================

-- 5. AUTO-CREATE PROFILE ON USER SIGN-UP TRIGGER
-- This function runs automatically when a new user registers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================

-- 6. SUPABASE STORAGE BUCKET
-- Run this SQL to create the 'media' bucket for generated media
-- (or create it manually in Storage > New Bucket > name: media, public: true)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,           -- Public bucket so URLs work without auth
  104857600,      -- 100MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600;

-- Storage RLS policies for 'media' bucket
CREATE POLICY "media_bucket_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "media_bucket_auth_upload" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media');

CREATE POLICY "media_bucket_service_role_all" ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'media')
  WITH CHECK (bucket_id = 'media');

-- ============================================================
-- Done! All tables, RLS policies, and storage bucket created.
-- ============================================================
