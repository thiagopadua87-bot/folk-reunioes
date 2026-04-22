-- Adiciona autor_nome aos logs do pipeline
ALTER TABLE public.pipeline_logs ADD COLUMN IF NOT EXISTS autor_nome TEXT;

-- Tabela de logs de vendas
CREATE TABLE IF NOT EXISTS public.vendas_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  venda_id      UUID        NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  campo         TEXT        NOT NULL,
  valor_anterior TEXT       NOT NULL DEFAULT '',
  valor_novo    TEXT        NOT NULL DEFAULT '',
  autor_nome    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vendas_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos autenticados acessam vendas_logs" ON public.vendas_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
