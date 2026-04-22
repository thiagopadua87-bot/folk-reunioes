-- ============================================================
-- Folk Reuniões — Schema Supabase
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- ============================================================
-- 1. Tabela de perfis de usuários
-- ============================================================
CREATE TABLE public.profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'user'     CHECK (role   IN ('user', 'admin')),
  status     TEXT        NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário lê próprio perfil" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Usuário cria próprio perfil" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================
-- 2. Reuniões (por usuário)
-- ============================================================
CREATE TABLE public.reunioes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responsavel   TEXT        NOT NULL DEFAULT '',
  participantes TEXT        NOT NULL DEFAULT '',
  blocos        JSONB       NOT NULL DEFAULT '[]',
  progresso     INT         NOT NULL DEFAULT 0,
  resumo        TEXT        NOT NULL DEFAULT ''
);

ALTER TABLE public.reunioes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário acessa próprias reuniões" ON public.reunioes
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 3. Dados comerciais (por usuário)
-- ============================================================
CREATE TABLE public.dados_comerciais (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo    TEXT NOT NULL CHECK (tipo IN ('vendas', 'pipeline')),
  linhas  JSONB NOT NULL DEFAULT '[]',
  UNIQUE (user_id, tipo)
);

ALTER TABLE public.dados_comerciais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário acessa próprios dados comerciais" ON public.dados_comerciais
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 4. Dados de projetos (por usuário)
-- ============================================================
CREATE TABLE public.dados_projetos (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo    TEXT NOT NULL CHECK (tipo IN ('projetos', 'obras')),
  linhas  JSONB NOT NULL DEFAULT '[]',
  UNIQUE (user_id, tipo)
);

ALTER TABLE public.dados_projetos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário acessa próprios dados de projetos" ON public.dados_projetos
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 5. Trigger: criar perfil automaticamente no cadastro
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    'user',
    'pendente'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 6. Para tornar um usuário admin manualmente:
--    UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@example.com';
-- ============================================================
