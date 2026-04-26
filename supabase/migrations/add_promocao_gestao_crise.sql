-- Mudança 2: campos de promoção em gestao_crise
-- cliente_perdido_id: ON DELETE RESTRICT — não permite deletar o registro de cliente perdido
--   enquanto houver uma crise apontando para ele (usuário deve desfazer a promoção antes).
ALTER TABLE public.gestao_crise
  ADD COLUMN IF NOT EXISTS promovido_para_perdido BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cliente_perdido_id     UUID REFERENCES public.clientes_perdidos(id) ON DELETE RESTRICT;
