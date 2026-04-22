-- ============================================================
-- Folk Reuniões — Módulo Gerência de Projetos
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 1. Projetos
-- ============================================================
CREATE TABLE public.projetos (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  data_inicio  DATE        NOT NULL,
  cliente      TEXT        NOT NULL,
  tipo         TEXT        NOT NULL CHECK (tipo IN ('portaria_remota','grandes_projetos','seguranca_eletronica')),
  situacao     TEXT        NOT NULL CHECK (situacao IN ('em_execucao','entregue_ao_comercial')),
  valor        NUMERIC     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a projetos" ON public.projetos
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- ============================================================
-- 2. Obras
-- ============================================================
CREATE TABLE public.obras (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  data_inicio DATE        NOT NULL,
  cliente     TEXT        NOT NULL,
  tipo        TEXT        NOT NULL CHECK (tipo IN ('portaria_remota','grandes_projetos','seguranca_eletronica')),
  situacao    TEXT        NOT NULL CHECK (situacao IN ('a_executar','em_execucao','paralizada','finalizada')),
  equipe      TEXT        NOT NULL CHECK (equipe IN ('equipe_propria','terceiro')),
  executor    TEXT        NOT NULL DEFAULT '',
  andamento   INT         NOT NULL DEFAULT 0 CHECK (andamento IN (0,20,40,60,80,100)),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a obras" ON public.obras
  FOR ALL USING (auth.uid() = user_id OR public.is_admin());
