-- Histórico de alterações do Operacional
-- Execute no Supabase Dashboard → SQL Editor

-- Logs de Clientes Perdidos
CREATE TABLE IF NOT EXISTS public.clientes_perdidos_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  registro_id UUID        NOT NULL REFERENCES public.clientes_perdidos(id) ON DELETE CASCADE,
  campo       TEXT        NOT NULL,
  valor_anterior TEXT     NOT NULL DEFAULT '',
  valor_novo  TEXT        NOT NULL DEFAULT '',
  autor_nome  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clientes_perdidos_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos autenticados acessam clientes_perdidos_logs" ON public.clientes_perdidos_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS clientes_perdidos_logs_registro_id_idx
  ON public.clientes_perdidos_logs (registro_id, created_at DESC);

-- Logs de Gestão de Crise
CREATE TABLE IF NOT EXISTS public.crise_logs (
  id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  crise_id UUID        NOT NULL REFERENCES public.gestao_crise(id) ON DELETE CASCADE,
  campo    TEXT        NOT NULL,
  valor_anterior TEXT  NOT NULL DEFAULT '',
  valor_novo TEXT      NOT NULL DEFAULT '',
  autor_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.crise_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos autenticados acessam crise_logs" ON public.crise_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS crise_logs_crise_id_idx
  ON public.crise_logs (crise_id, created_at DESC);
