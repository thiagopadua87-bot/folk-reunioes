-- Histórico de alterações do Pipeline
-- Execute no Supabase Dashboard → SQL Editor

CREATE TABLE public.pipeline_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  proposta_id    UUID        NOT NULL REFERENCES public.pipeline(id) ON DELETE CASCADE,
  campo          TEXT        NOT NULL,
  valor_anterior TEXT        NOT NULL DEFAULT '',
  valor_novo     TEXT        NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pipeline_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a pipeline_logs" ON public.pipeline_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pipeline
      WHERE pipeline.id = pipeline_logs.proposta_id
        AND (pipeline.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE INDEX pipeline_logs_proposta_id_idx ON public.pipeline_logs (proposta_id, created_at DESC);
