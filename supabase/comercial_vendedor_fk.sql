-- Substitui campo responsavel por vendedor_id (FK) e adiciona indicado_por e observacoes
-- Execute no Supabase Dashboard → SQL Editor

ALTER TABLE public.vendas DROP COLUMN IF EXISTS responsavel;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS vendedor_id  UUID REFERENCES public.vendedores(id) ON DELETE SET NULL;
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS indicado_por TEXT NOT NULL DEFAULT '';
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS observacoes  TEXT NOT NULL DEFAULT '';

ALTER TABLE public.pipeline DROP COLUMN IF EXISTS responsavel;
ALTER TABLE public.pipeline ADD COLUMN IF NOT EXISTS vendedor_id  UUID REFERENCES public.vendedores(id) ON DELETE SET NULL;
ALTER TABLE public.pipeline ADD COLUMN IF NOT EXISTS indicado_por TEXT NOT NULL DEFAULT '';
ALTER TABLE public.pipeline ADD COLUMN IF NOT EXISTS observacoes  TEXT NOT NULL DEFAULT '';
