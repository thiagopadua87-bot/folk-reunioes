-- ============================================================
-- Folk Reuniões — Módulo Comercial
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 1. Vendas
-- ============================================================
CREATE TABLE public.vendas (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  data_fechamento  DATE        NOT NULL,
  responsavel      TEXT        NOT NULL DEFAULT '',
  cliente          TEXT        NOT NULL,
  valor            NUMERIC     NOT NULL DEFAULT 0,
  servico          TEXT        NOT NULL DEFAULT '',
  tipo_venda       TEXT        NOT NULL CHECK (tipo_venda IN ('recorrente','venda_direta')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a vendas" ON public.vendas
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- ============================================================
-- 2. Pipeline
-- ============================================================
CREATE TABLE public.pipeline (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  data_inicio_lead DATE        NOT NULL,
  responsavel      TEXT        NOT NULL DEFAULT '',
  cliente          TEXT        NOT NULL,
  temperatura        TEXT        NOT NULL CHECK (temperatura IN ('fria','morna','quente')),
  valor_implantacao  NUMERIC     NOT NULL DEFAULT 0,
  valor_mensal       NUMERIC     NOT NULL DEFAULT 0,
  status             TEXT        NOT NULL CHECK (status IN (
                     'apresentacao','em_analise','assinatura','fechado','declinado','fechado_ganho')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a pipeline" ON public.pipeline
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());
