CREATE TABLE public.crisis_actions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  crise_id    UUID        NOT NULL REFERENCES public.gestao_crise(id) ON DELETE CASCADE,
  what        TEXT        NOT NULL,
  how         TEXT        NOT NULL DEFAULT '',
  who         TEXT        NOT NULL,
  when_date   DATE        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'PENDENTE'
                CHECK (status IN ('PENDENTE','EM_ANDAMENTO','CONCLUIDO')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.crisis_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a crisis_actions" ON public.crisis_actions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gestao_crise gc
      WHERE gc.id = crisis_actions.crise_id
        AND (gc.user_id = auth.uid() OR public.is_admin())
    )
  );
