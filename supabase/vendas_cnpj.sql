-- Adiciona campo CNPJ na tabela de vendas
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS cnpj TEXT NOT NULL DEFAULT '';
