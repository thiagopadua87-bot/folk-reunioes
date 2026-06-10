-- ============================================================
-- Campos: data_assembleia + ultima_interacao
-- ============================================================

ALTER TABLE public.pipeline
  ADD COLUMN IF NOT EXISTS data_assembleia   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ultima_interacao  TIMESTAMPTZ;

-- Preencher ultima_interacao com created_at nos registros existentes
UPDATE public.pipeline
SET ultima_interacao = created_at
WHERE ultima_interacao IS NULL;

CREATE INDEX IF NOT EXISTS idx_pipeline_ultima_interacao
  ON public.pipeline (ultima_interacao)
  WHERE ultima_interacao IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pipeline_data_assembleia
  ON public.pipeline (data_assembleia)
  WHERE data_assembleia IS NOT NULL;
