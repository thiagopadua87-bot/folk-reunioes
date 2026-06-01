-- Adiciona campo CNPJ na tabela de pipeline
ALTER TABLE public.pipeline
  ADD COLUMN IF NOT EXISTS cnpj VARCHAR(14) NOT NULL DEFAULT '';

-- Índice para buscas por CNPJ
CREATE INDEX IF NOT EXISTS idx_pipeline_cnpj
  ON public.pipeline(cnpj);

-- Índice único parcial para evitar CNPJs duplicados (ativar quando o dado estiver limpo)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_pipeline_cnpj_unique
--   ON public.pipeline(cnpj)
--   WHERE cnpj IS NOT NULL AND cnpj <> '';
