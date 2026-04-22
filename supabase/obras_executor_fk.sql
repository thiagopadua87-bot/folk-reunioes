-- Substitui executor (texto livre) por FKs para técnicos e terceirizados
-- Execute no Supabase Dashboard → SQL Editor

ALTER TABLE public.obras DROP COLUMN IF EXISTS executor;
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS tecnico_id      UUID REFERENCES public.tecnicos(id)      ON DELETE SET NULL;
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS terceirizado_id UUID REFERENCES public.terceirizados(id) ON DELETE SET NULL;
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS valor_execucao  NUMERIC(12,2) NOT NULL DEFAULT 0;
