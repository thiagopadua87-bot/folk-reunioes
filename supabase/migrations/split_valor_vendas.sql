-- ============================================================
-- Vendas: substituição de valor
-- por valor_implantacao + valor_mensal
-- ============================================================

ALTER TABLE public.vendas
  ADD COLUMN valor_implantacao NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN valor_mensal      NUMERIC NOT NULL DEFAULT 0;

-- Migra dados existentes para implantacao
UPDATE public.vendas
  SET valor_implantacao = valor;

ALTER TABLE public.vendas
  DROP COLUMN valor;
