-- ============================================================
-- Folk Reuniões — Engenharia Comercial: RLS por Ownership
-- Substitui políticas "USING(true) WITH CHECK(true)" nas tabelas
-- filhas do EC por verificação de propriedade via proposta.
--
-- Contexto: tabelas filhas só devem ser escritas pelo dono da
-- proposta (ou admin). Leitura permanece aberta a todos os
-- membros autenticados (visibilidade de equipe).
-- ============================================================

-- ── Helper: subquery de ownership ────────────────────────────
-- Reutilizado em todas as políticas abaixo.
-- Cadeia: <tabela>.versao_id → ec_versoes.proposta_id → ec_propostas.created_by

-- ── ec_projeto_dados ─────────────────────────────────────────
DROP POLICY IF EXISTS "ec_proj_dados_escreve_autenticados" ON public.ec_projeto_dados;

CREATE POLICY "ec_proj_dados_escreve_owner" ON public.ec_projeto_dados
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_projeto_dados.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );

-- ── ec_necessidades ──────────────────────────────────────────
DROP POLICY IF EXISTS "ec_necessidades_escreve_autenticados" ON public.ec_necessidades;

CREATE POLICY "ec_necessidades_escreve_owner" ON public.ec_necessidades
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_necessidades.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );

-- ── ec_premissas ─────────────────────────────────────────────
DROP POLICY IF EXISTS "ec_premissas_escreve_autenticados" ON public.ec_premissas;

CREATE POLICY "ec_premissas_escreve_owner" ON public.ec_premissas
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_premissas.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );

-- ── ec_versao_solucoes ───────────────────────────────────────
DROP POLICY IF EXISTS "ec_vs_escreve_autenticados" ON public.ec_versao_solucoes;

CREATE POLICY "ec_vs_escreve_owner" ON public.ec_versao_solucoes
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_versao_solucoes.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );

-- ── ec_custos_proposta ───────────────────────────────────────
DROP POLICY IF EXISTS "ec_cp_escreve_autenticados" ON public.ec_custos_proposta;

CREATE POLICY "ec_cp_escreve_owner" ON public.ec_custos_proposta
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_custos_proposta.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );

-- ── ec_lista_materiais ───────────────────────────────────────
-- Escrita exclusiva do motor (calcularEngenharia) que roda
-- no browser autenticado como o dono da proposta.
DROP POLICY IF EXISTS "ec_lm_escreve_autenticados" ON public.ec_lista_materiais;

CREATE POLICY "ec_lm_escreve_owner" ON public.ec_lista_materiais
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_lista_materiais.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );

-- ── ec_precificacao ──────────────────────────────────────────
DROP POLICY IF EXISTS "ec_prec_escreve_autenticados" ON public.ec_precificacao;

CREATE POLICY "ec_prec_escreve_owner" ON public.ec_precificacao
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_precificacao.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );
