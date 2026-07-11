-- ============================================================
-- ERP 2.0 — Perfis organizacionais + inativação de usuários + audit log
-- ============================================================

-- Tabela de perfis do sistema (organizacional)
CREATE TABLE IF NOT EXISTS public.profiles_system (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text        NOT NULL,
  descricao   text,
  cor         text        NOT NULL DEFAULT '#6B7280',
  ordem       integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_system_nome_unique UNIQUE (nome)
);

ALTER TABLE public.profiles_system ENABLE ROW LEVEL SECURITY;

CREATE POLICY "everyone_read_profiles_system" ON public.profiles_system
  FOR SELECT USING (true);

CREATE POLICY "admin_manage_profiles_system" ON public.profiles_system
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seed dos perfis iniciais
INSERT INTO public.profiles_system (nome, descricao, cor, ordem) VALUES
  ('Administrador',       'Acesso total ao sistema',             '#EF4444', 1),
  ('Diretor',             'Diretoria da empresa',                '#8B5CF6', 2),
  ('Gerente',             'Gestão de equipes e processos',       '#3B82F6', 3),
  ('Supervisor',          'Supervisão operacional',              '#06B6D4', 4),
  ('Analista',            'Análises e relatórios',               '#10B981', 5),
  ('Consultor Comercial', 'Equipe comercial e vendas',           '#F59E0B', 6),
  ('Técnico',             'Execução técnica e obras',            '#84CC16', 7),
  ('Monitor',             'Monitoramento e suporte',             '#F97316', 8),
  ('Financeiro',          'Gestão financeira e cobrança',        '#EC4899', 9),
  ('Outro',               'Perfil não categorizado',             '#6B7280', 10)
ON CONFLICT (nome) DO NOTHING;

-- Novos campos na tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS perfil_id         uuid        REFERENCES public.profiles_system(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ativo             boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS data_inativacao   timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_inativacao text;

-- Audit log de ações administrativas
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  realizado_por  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  usuario_alvo   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  acao           text        NOT NULL,
  detalhes       jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_audit_log" ON public.admin_audit_log
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_insert_audit_log" ON public.admin_audit_log
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
