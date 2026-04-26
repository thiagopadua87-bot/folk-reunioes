-- Mudança 1: campos de carta de cancelamento em gestao_crise
ALTER TABLE public.gestao_crise
  ADD COLUMN IF NOT EXISTS apresentou_carta_cancelamento BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_aviso                   DATE,
  ADD COLUMN IF NOT EXISTS prazo_aviso_dias             INTEGER;
