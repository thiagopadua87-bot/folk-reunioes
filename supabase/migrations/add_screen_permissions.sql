-- ============================================================
-- Permissões granulares por tela para cada usuário
-- ============================================================

CREATE TABLE IF NOT EXISTS public.screen_permissions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  screen_key text        NOT NULL,
  can_view   boolean     NOT NULL DEFAULT true,
  can_edit   boolean     NOT NULL DEFAULT true,
  can_delete boolean     NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT screen_permissions_user_screen_unique UNIQUE (user_id, screen_key)
);

ALTER TABLE public.screen_permissions ENABLE ROW LEVEL SECURITY;

-- Admin pode ler e escrever todas as permissões
CREATE POLICY "admin_full_access" ON public.screen_permissions
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Usuário pode ler suas próprias permissões
CREATE POLICY "user_read_own" ON public.screen_permissions
  FOR SELECT
  USING (user_id = auth.uid());
