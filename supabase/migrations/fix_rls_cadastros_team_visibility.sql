-- Abre leitura e escrita dos cadastros para todos os usuários aprovados.
-- Antes: cada usuário via apenas os próprios registros (user_id = auth.uid()).
-- Depois: qualquer aprovado pode ver e editar todos os cadastros (mesmo padrão de gestao_crise).

-- competitors
DROP POLICY IF EXISTS "Acesso a competitors" ON public.competitors;
CREATE POLICY "Acesso a competitors" ON public.competitors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  );

-- opportunity_competitors
DROP POLICY IF EXISTS "Acesso a opportunity_competitors" ON public.opportunity_competitors;
CREATE POLICY "Acesso a opportunity_competitors" ON public.opportunity_competitors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  );

-- vendedores
DROP POLICY IF EXISTS "Acesso a vendedores" ON public.vendedores;
CREATE POLICY "Acesso a vendedores" ON public.vendedores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  );

-- tecnicos
DROP POLICY IF EXISTS "Acesso a tecnicos" ON public.tecnicos;
CREATE POLICY "Acesso a tecnicos" ON public.tecnicos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  );

-- terceirizados
DROP POLICY IF EXISTS "Acesso a terceirizados" ON public.terceirizados;
CREATE POLICY "Acesso a terceirizados" ON public.terceirizados
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  );
