ALTER TABLE public.pipeline
  ADD COLUMN IF NOT EXISTS winner_competitor_id UUID REFERENCES public.competitors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS loss_reason          TEXT NOT NULL DEFAULT '';
