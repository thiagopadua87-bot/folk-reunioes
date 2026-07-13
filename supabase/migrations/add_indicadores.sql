-- ============================================================
-- MÓDULO INDICADORES — MIGRATION (idempotente)
-- ============================================================

-- 1. Tabela indicadores
CREATE TABLE IF NOT EXISTS public.indicadores (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  nome       text        NOT NULL,
  telefone   text        NOT NULL DEFAULT '',
  email      text        NOT NULL DEFAULT '',
  tipo       text        NOT NULL DEFAULT 'pessoa_fisica'
    CHECK (tipo IN ('pessoa_fisica', 'empresa', 'corretor', 'outro')),
  ativo      boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.indicadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_indicadores"    ON public.indicadores;
DROP POLICY IF EXISTS "auth_manage_indicadores"  ON public.indicadores;

CREATE POLICY "auth_read_indicadores" ON public.indicadores
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "auth_manage_indicadores" ON public.indicadores
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. FK em vendas apontando para indicadores
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS indicado_por_id uuid
    REFERENCES public.indicadores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS vendas_indicado_por_id_idx ON public.vendas(indicado_por_id);

-- 3. Comissões: vendedor_id vira nullable; nova coluna indicador_ref_id
ALTER TABLE public.comissoes
  ALTER COLUMN vendedor_id DROP NOT NULL;

ALTER TABLE public.comissoes
  ADD COLUMN IF NOT EXISTS indicador_ref_id uuid
    REFERENCES public.indicadores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS comissoes_indicador_ref_id_idx ON public.comissoes(indicador_ref_id);
