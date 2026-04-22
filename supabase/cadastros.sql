-- ============================================================
-- Módulo Cadastros: vendedores, tecnicos, terceirizados
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================================

-- ── vendedores ───────────────────────────────────────────────

CREATE TABLE public.vendedores (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       TEXT        NOT NULL,
  telefone   TEXT        NOT NULL DEFAULT '',
  email      TEXT        NOT NULL DEFAULT '',
  ativo      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vendedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a vendedores" ON public.vendedores
  FOR ALL USING (user_id = auth.uid() OR public.is_admin());

-- ── tecnicos ─────────────────────────────────────────────────

CREATE TABLE public.tecnicos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       TEXT        NOT NULL,
  telefone   TEXT        NOT NULL DEFAULT '',
  email      TEXT        NOT NULL DEFAULT '',
  ativo      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a tecnicos" ON public.tecnicos
  FOR ALL USING (user_id = auth.uid() OR public.is_admin());

-- ── terceirizados ─────────────────────────────────────────────

CREATE TABLE public.terceirizados (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_empresa            TEXT        NOT NULL,
  contato                 TEXT        NOT NULL DEFAULT '',
  telefone                TEXT        NOT NULL DEFAULT '',
  email                   TEXT        NOT NULL DEFAULT '',
  cpf                     TEXT        NOT NULL DEFAULT '',
  tecnico_responsavel_id  UUID        REFERENCES public.tecnicos(id) ON DELETE SET NULL,
  tipo_servico            TEXT        NOT NULL DEFAULT '',
  ativo                   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.terceirizados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a terceirizados" ON public.terceirizados
  FOR ALL USING (user_id = auth.uid() OR public.is_admin());
