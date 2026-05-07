-- Corrige visibilidade e edição de Gestão de Crise e Clientes Perdidos para todos os usuários aprovados.
-- Qualquer usuário aprovado pode ler, criar e editar. Exclusão restrita a criador ou admin (reforçada no app).

-- ── Gestão de Crise ──────────────────────────────────────────
DROP POLICY IF EXISTS "Acesso a gestao_crise" ON public.gestao_crise;
DROP POLICY IF EXISTS "Leitura de gestao_crise" ON public.gestao_crise;
DROP POLICY IF EXISTS "Escrita de gestao_crise" ON public.gestao_crise;

CREATE POLICY "Acesso a gestao_crise" ON public.gestao_crise
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND status = 'aprovado'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND status = 'aprovado'
    )
  );

-- ── Clientes Perdidos ────────────────────────────────────────
DROP POLICY IF EXISTS "Acesso a clientes_perdidos" ON public.clientes_perdidos;
DROP POLICY IF EXISTS "Leitura de clientes_perdidos" ON public.clientes_perdidos;
DROP POLICY IF EXISTS "Escrita de clientes_perdidos" ON public.clientes_perdidos;

CREATE POLICY "Acesso a clientes_perdidos" ON public.clientes_perdidos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND status = 'aprovado'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND status = 'aprovado'
    )
  );
