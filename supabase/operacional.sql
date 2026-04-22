-- ============================================================
-- Folk Reuniões — Módulo Operacional
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================================

-- Função auxiliar para verificar se o usuário logado é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- 1. Clientes Perdidos
-- ============================================================
CREATE TABLE public.clientes_perdidos (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_aviso         DATE        NOT NULL,
  data_encerramento  DATE        NOT NULL,
  cliente            TEXT        NOT NULL,
  tipo_servico       TEXT        NOT NULL CHECK (tipo_servico IN (
                       'portaria_remota','monitoramento','monitoramento_manutencao',
                       'monitoramento_locacao','locacao_equipamentos')),
  valor_contrato     NUMERIC     NOT NULL DEFAULT 0,
  motivo_perda       TEXT        NOT NULL CHECK (motivo_perda IN (
                       'qualidade_servico','preco','relacionamento','faturamento','outros')),
  observacoes        TEXT        NOT NULL DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clientes_perdidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a clientes_perdidos" ON public.clientes_perdidos
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- ============================================================
-- 2. Gestão de Crise
-- ============================================================
CREATE TABLE public.gestao_crise (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente      TEXT        NOT NULL,
  tipo_servico TEXT        NOT NULL CHECK (tipo_servico IN (
                 'portaria_remota','monitoramento','monitoramento_manutencao',
                 'monitoramento_locacao','locacao_equipamentos')),
  risco        TEXT        NOT NULL CHECK (risco IN ('baixo','medio','alto')),
  acoes        TEXT        NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gestao_crise ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a gestao_crise" ON public.gestao_crise
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());
