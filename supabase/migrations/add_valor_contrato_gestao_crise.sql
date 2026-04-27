-- Adiciona valor do contrato à gestão de crise
ALTER TABLE public.gestao_crise
  ADD COLUMN IF NOT EXISTS valor_contrato NUMERIC NOT NULL DEFAULT 0;
