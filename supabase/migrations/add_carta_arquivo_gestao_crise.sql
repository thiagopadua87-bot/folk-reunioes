-- Mudança 1 (complemento): campos para arquivo PDF da carta de cancelamento
ALTER TABLE public.gestao_crise
  ADD COLUMN IF NOT EXISTS carta_url  TEXT,
  ADD COLUMN IF NOT EXISTS carta_nome TEXT;
