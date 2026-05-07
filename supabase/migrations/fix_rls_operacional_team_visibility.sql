-- Corrige visibilidade de Gestão de Crise e Clientes Perdidos para todos os usuários aprovados.
-- Antes: cada usuário só via seus próprios registros.
-- Depois: qualquer usuário aprovado lê tudo; escrita restrita a criador ou admin.

-- ── Gestão de Crise ──────────────────────────────────────────
DROP POLICY IF EXISTS "Acesso a gestao_crise" ON public.gestao_crise;

CREATE POLICY "Leitura de gestao_crise" ON public.gestao_crise
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND status = 'aprovado'
    )
  );

CREATE POLICY "Escrita de gestao_crise" ON public.gestao_crise
  FOR ALL USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ── Clientes Perdidos ────────────────────────────────────────
DROP POLICY IF EXISTS "Acesso a clientes_perdidos" ON public.clientes_perdidos;

CREATE POLICY "Leitura de clientes_perdidos" ON public.clientes_perdidos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND status = 'aprovado'
    )
  );

CREATE POLICY "Escrita de clientes_perdidos" ON public.clientes_perdidos
  FOR ALL USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());
