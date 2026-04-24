-- Substitui valor_aproximado por valor_implantacao + valor_mensal no pipeline
-- Execute no Supabase Dashboard → SQL Editor

ALTER TABLE public.pipeline
  ADD COLUMN valor_implantacao NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN valor_mensal      NUMERIC NOT NULL DEFAULT 0;

UPDATE public.pipeline
  SET valor_implantacao = valor_aproximado;

ALTER TABLE public.pipeline
  DROP COLUMN valor_aproximado;
