-- ============================================================
-- Dashboard Comercial 2.0
-- 1. Tabela metas_comerciais
-- 2. Coluna motivo_perda_categoria em pipeline
-- ============================================================

-- ── 1. Metas Comerciais ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.metas_comerciais (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ano              INTEGER     NOT NULL,
  mes              INTEGER     NOT NULL CHECK (mes BETWEEN 1 AND 12),
  meta_contratos   INTEGER     NOT NULL DEFAULT 0,
  meta_mrr         NUMERIC(12,2) NOT NULL DEFAULT 0,
  meta_implantacao NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ano, mes)
);

ALTER TABLE public.metas_comerciais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aprovados podem ler metas_comerciais" ON public.metas_comerciais
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  );

CREATE POLICY "Aprovados podem inserir metas_comerciais" ON public.metas_comerciais
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  );

CREATE POLICY "Aprovados podem atualizar metas_comerciais" ON public.metas_comerciais
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  );

-- ── 2. Categoria de motivo de perda no pipeline ──────────────

ALTER TABLE public.pipeline
  ADD COLUMN IF NOT EXISTS motivo_perda_categoria TEXT
  CHECK (motivo_perda_categoria IS NULL OR motivo_perda_categoria IN (
    'Preço',
    'Concorrência',
    'Sem Interesse',
    'Sem Retorno',
    'Assembleia Rejeitada',
    'Momento Inadequado',
    'Mudança de Prioridade',
    'Outro'
  ));

CREATE INDEX IF NOT EXISTS idx_pipeline_motivo_perda_categoria
  ON public.pipeline (motivo_perda_categoria)
  WHERE motivo_perda_categoria IS NOT NULL;
