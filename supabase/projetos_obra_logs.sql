-- Histórico de alterações: projetos e obras
-- Execute no Supabase Dashboard → SQL Editor

-- ── projeto_logs ─────────────────────────────────────────────

CREATE TABLE public.projeto_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  projeto_id UUID        NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  campo      TEXT        NOT NULL,
  valor_anterior TEXT    NOT NULL DEFAULT '',
  valor_novo     TEXT    NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.projeto_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a projeto_logs" ON public.projeto_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projetos
      WHERE projetos.id = projeto_logs.projeto_id
        AND (projetos.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE INDEX projeto_logs_projeto_id_idx ON public.projeto_logs (projeto_id, created_at DESC);

-- ── obra_logs ─────────────────────────────────────────────────

CREATE TABLE public.obra_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  obra_id    UUID        NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  campo      TEXT        NOT NULL,
  valor_anterior TEXT    NOT NULL DEFAULT '',
  valor_novo     TEXT    NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.obra_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a obra_logs" ON public.obra_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.obras
      WHERE obras.id = obra_logs.obra_id
        AND (obras.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE INDEX obra_logs_obra_id_idx ON public.obra_logs (obra_id, created_at DESC);
