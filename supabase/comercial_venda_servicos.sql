-- ============================================================
-- Refatoração: vendas.servicos (array) → tabela venda_servicos
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Criar tabela relacional
CREATE TABLE public.venda_servicos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id   UUID        NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  servico    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.venda_servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a venda_servicos" ON public.venda_servicos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.vendas
      WHERE vendas.id = venda_servicos.venda_id
        AND (vendas.user_id = auth.uid() OR public.is_admin())
    )
  );

-- 2. Migrar dados existentes (array → linhas)
INSERT INTO public.venda_servicos (venda_id, servico)
SELECT id, unnest(servicos)
FROM public.vendas
WHERE servicos IS NOT NULL AND array_length(servicos, 1) > 0;

-- 3. Remover coluna antiga
ALTER TABLE public.vendas DROP COLUMN IF EXISTS servicos;
