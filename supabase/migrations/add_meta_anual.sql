-- Permite mes = 0 para representar meta anual (1–12 = mensal, 0 = anual)
ALTER TABLE public.metas_comerciais
  DROP CONSTRAINT IF EXISTS metas_comerciais_mes_check;

ALTER TABLE public.metas_comerciais
  ADD CONSTRAINT metas_comerciais_mes_check
  CHECK (mes BETWEEN 0 AND 12);
