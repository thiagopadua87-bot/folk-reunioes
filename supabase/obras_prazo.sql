-- Adiciona prazo estimado e data de conclusão em obras
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS data_prazo DATE;
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS data_conclusao DATE;
