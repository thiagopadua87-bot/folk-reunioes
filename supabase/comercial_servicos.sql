-- Migração: campo servico → servicos (array) em vendas + servicos em pipeline
ALTER TABLE public.vendas DROP COLUMN IF EXISTS servico;
ALTER TABLE public.vendas ADD COLUMN servicos TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.pipeline ADD COLUMN servicos TEXT[] NOT NULL DEFAULT '{}';
