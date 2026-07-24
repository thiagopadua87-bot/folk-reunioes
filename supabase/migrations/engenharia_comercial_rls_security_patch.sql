-- ============================================================
-- Folk Reuniões — Engenharia Comercial: Security Patch RLS
--
-- Problema corrigido:
--   O uso de FOR ALL USING(true) expunha DELETE e UPDATE sem
--   verificação de ownership, permitindo que qualquer usuário
--   autenticado apagasse ou realocasse registros alheios.
--
-- Estratégia:
--   Para cada tabela filha: políticas separadas por operação,
--   cada uma com subquery de ownership explícita.
--
--   Para ec_versoes: INSERT agora exige ser dono da proposta.
--   Para ec_historico_versoes: INSERT agora exige ownership da versão.
--
-- Depende de:
--   engenharia_comercial_rls_ownership.sql (dropa as políticas
--   *_escreve_owner criadas nessa migration anterior)
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- MACRO (comentário): subquery de ownership para tabelas filhas
--
--   EXISTS (
--     SELECT 1 FROM public.ec_versoes v
--     JOIN public.ec_propostas p ON p.id = v.proposta_id
--     WHERE v.id = <tabela>.versao_id
--       AND (p.created_by = auth.uid() OR public.is_admin())
--   )
--
-- SELECT mantém USING(true) — visibilidade de equipe intencional.
-- INSERT usa apenas WITH CHECK (linha não existe ainda).
-- UPDATE usa USING (filtra linha existente) + WITH CHECK
--           (valida linha resultante — impede troca de versao_id).
-- DELETE usa apenas USING (valida linha a excluir).
-- ──────────────────────────────────────────────────────────────


-- ============================================================
-- 0. Remover políticas FOR ALL da fase4 (idempotente)
--
-- Se rls_ownership.sql foi pulado (ex: banco recém-criado com
-- apenas fase1-fase4), as políticas *_escreve_autenticados ainda
-- existem e anulam tudo que vem abaixo via OR lógico do Postgres.
-- DROP IF EXISTS garante idempotência independente do estado.
-- ============================================================

DROP POLICY IF EXISTS "ec_proj_dados_escreve_autenticados" ON public.ec_projeto_dados;
DROP POLICY IF EXISTS "ec_necessidades_escreve_autenticados" ON public.ec_necessidades;
DROP POLICY IF EXISTS "ec_premissas_escreve_autenticados" ON public.ec_premissas;
DROP POLICY IF EXISTS "ec_vs_escreve_autenticados" ON public.ec_versao_solucoes;
DROP POLICY IF EXISTS "ec_cp_escreve_autenticados" ON public.ec_custos_proposta;
DROP POLICY IF EXISTS "ec_lm_escreve_autenticados" ON public.ec_lista_materiais;
DROP POLICY IF EXISTS "ec_prec_escreve_autenticados" ON public.ec_precificacao;


-- ============================================================
-- 1. ec_projeto_dados
-- ============================================================

DROP POLICY IF EXISTS "ec_proj_dados_escreve_owner" ON public.ec_projeto_dados;

CREATE POLICY "ec_proj_dados_insere_owner" ON public.ec_projeto_dados
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_projeto_dados.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "ec_proj_dados_atualiza_owner" ON public.ec_projeto_dados
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_projeto_dados.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_projeto_dados.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "ec_proj_dados_exclui_owner" ON public.ec_projeto_dados
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_projeto_dados.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );


-- ============================================================
-- 2. ec_necessidades
-- ============================================================

DROP POLICY IF EXISTS "ec_necessidades_escreve_owner" ON public.ec_necessidades;

CREATE POLICY "ec_necessidades_insere_owner" ON public.ec_necessidades
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_necessidades.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "ec_necessidades_atualiza_owner" ON public.ec_necessidades
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_necessidades.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_necessidades.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "ec_necessidades_exclui_owner" ON public.ec_necessidades
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_necessidades.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );


-- ============================================================
-- 3. ec_premissas
-- ============================================================

DROP POLICY IF EXISTS "ec_premissas_escreve_owner" ON public.ec_premissas;

CREATE POLICY "ec_premissas_insere_owner" ON public.ec_premissas
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_premissas.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "ec_premissas_atualiza_owner" ON public.ec_premissas
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_premissas.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_premissas.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "ec_premissas_exclui_owner" ON public.ec_premissas
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_premissas.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );


-- ============================================================
-- 4. ec_versao_solucoes
-- ============================================================

DROP POLICY IF EXISTS "ec_vs_escreve_owner" ON public.ec_versao_solucoes;

CREATE POLICY "ec_vs_insere_owner" ON public.ec_versao_solucoes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_versao_solucoes.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "ec_vs_atualiza_owner" ON public.ec_versao_solucoes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_versao_solucoes.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_versao_solucoes.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "ec_vs_exclui_owner" ON public.ec_versao_solucoes
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_versao_solucoes.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );


-- ============================================================
-- 5. ec_custos_proposta
-- ============================================================

DROP POLICY IF EXISTS "ec_cp_escreve_owner" ON public.ec_custos_proposta;

CREATE POLICY "ec_cp_insere_owner" ON public.ec_custos_proposta
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_custos_proposta.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "ec_cp_atualiza_owner" ON public.ec_custos_proposta
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_custos_proposta.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_custos_proposta.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "ec_cp_exclui_owner" ON public.ec_custos_proposta
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_custos_proposta.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );


-- ============================================================
-- 6. ec_lista_materiais
-- ============================================================

DROP POLICY IF EXISTS "ec_lm_escreve_owner" ON public.ec_lista_materiais;

CREATE POLICY "ec_lm_insere_owner" ON public.ec_lista_materiais
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_lista_materiais.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "ec_lm_atualiza_owner" ON public.ec_lista_materiais
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_lista_materiais.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_lista_materiais.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "ec_lm_exclui_owner" ON public.ec_lista_materiais
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_lista_materiais.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );


-- ============================================================
-- 7. ec_precificacao
-- ============================================================

DROP POLICY IF EXISTS "ec_prec_escreve_owner" ON public.ec_precificacao;

CREATE POLICY "ec_prec_insere_owner" ON public.ec_precificacao
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_precificacao.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "ec_prec_atualiza_owner" ON public.ec_precificacao
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_precificacao.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_precificacao.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "ec_prec_exclui_owner" ON public.ec_precificacao
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_precificacao.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );


-- ============================================================
-- 8. ec_versoes — corrigir INSERT para exigir ownership da proposta
--
-- Problema anterior: qualquer autenticado podia criar uma versão
-- para qualquer proposta (apenas exigia created_by = auth.uid()).
-- Com acesso de escrita na versão, o usuário passava a ter
-- controle sobre todas as tabelas filhas daquela versão.
-- ============================================================

DROP POLICY IF EXISTS "ec_versoes_insere_autenticados" ON public.ec_versoes;

CREATE POLICY "ec_versoes_insere_owner" ON public.ec_versoes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.ec_propostas p
      WHERE p.id = ec_versoes.proposta_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );


-- ============================================================
-- 9. ec_historico_versoes — corrigir INSERT para exigir ownership
--
-- Problema anterior: qualquer autenticado podia inserir eventos
-- em qualquer versão (apenas exigia user_id = auth.uid()).
-- Isso permitia poluição do log de propostas alheias.
--
-- Nota: o trigger ec_log_versao_status é SECURITY DEFINER e
-- continua funcionando independentemente desta política.
-- ============================================================

DROP POLICY IF EXISTS "ec_hist_insere_autenticados" ON public.ec_historico_versoes;

CREATE POLICY "ec_hist_insere_owner" ON public.ec_historico_versoes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.ec_versoes v
      JOIN public.ec_propostas p ON p.id = v.proposta_id
      WHERE v.id = ec_historico_versoes.versao_id
        AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );
