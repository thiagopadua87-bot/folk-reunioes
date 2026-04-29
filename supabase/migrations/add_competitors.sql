CREATE TABLE public.competitors (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  cnpj        TEXT        NOT NULL DEFAULT '',
  legal_name  TEXT        NOT NULL,
  trade_name  TEXT        NOT NULL DEFAULT '',
  status      TEXT        NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a competitors" ON public.competitors
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- Junction table for pipeline ↔ competitors (many-to-many)
CREATE TABLE public.opportunity_competitors (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.pipeline(id) ON DELETE CASCADE,
  competitor_id  UUID NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  UNIQUE (opportunity_id, competitor_id)
);

ALTER TABLE public.opportunity_competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a opportunity_competitors" ON public.opportunity_competitors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pipeline p
      WHERE p.id = opportunity_competitors.opportunity_id
        AND (p.user_id = auth.uid() OR public.is_admin())
    )
  );
