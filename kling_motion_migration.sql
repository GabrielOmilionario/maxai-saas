-- ============================================================
-- Kling 3.0 Motion Control — Migration
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================================

-- Adiciona colunas extras na tabela generations para suportar Kling Motion Control
-- Todas as colunas são opcionais (nullable) para não quebrar registros existentes

ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS mode TEXT,
  ADD COLUMN IF NOT EXISTS resolution TEXT,
  ADD COLUMN IF NOT EXISTS orientation TEXT,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS credits_reserved INTEGER,
  ADD COLUMN IF NOT EXISTS credits_final INTEGER,
  ADD COLUMN IF NOT EXISTS source_image_url TEXT,
  ADD COLUMN IF NOT EXISTS source_video_url TEXT,
  ADD COLUMN IF NOT EXISTS external_task_id TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Índice para consulta eficiente por provider + status (polling)
CREATE INDEX IF NOT EXISTS idx_generations_provider_status
  ON public.generations (provider, status)
  WHERE provider IS NOT NULL;

-- Índice para external_task_id (idempotência)
CREATE INDEX IF NOT EXISTS idx_generations_external_task_id
  ON public.generations (external_task_id)
  WHERE external_task_id IS NOT NULL;

-- ============================================================
-- Done! Colunas adicionadas com sucesso.
-- ============================================================
