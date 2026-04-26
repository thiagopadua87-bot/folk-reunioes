-- Mudança 2: FK de clientes_perdidos → gestao_crise (origem da promoção)
-- ON DELETE SET NULL: se a crise for deletada, o registro de cliente perdido sobrevive sem o link
ALTER TABLE public.clientes_perdidos
  ADD COLUMN IF NOT EXISTS crise_id UUID REFERENCES public.gestao_crise(id) ON DELETE SET NULL;
