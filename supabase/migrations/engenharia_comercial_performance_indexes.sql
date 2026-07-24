-- ============================================================
-- Folk Reuniões — Engenharia Comercial: Índices de Performance
-- Complementa as fases 1–4 com índices para queries frequentes.
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================================

-- ec_versoes: flag de recálculo (filtrado em propostas-db.listarVersoes)
CREATE INDEX IF NOT EXISTS ec_versoes_necessita_recalculo_idx
  ON public.ec_versoes (proposta_id, necessita_recalculo)
  WHERE necessita_recalculo = true;

-- ec_versoes: status + is_current (filtros mais comuns nas listagens)
CREATE INDEX IF NOT EXISTS ec_versoes_status_current_idx
  ON public.ec_versoes (proposta_id, status, is_current);

-- ec_lista_materiais: item_id (joins com catálogo)
-- (versao_id já tem índice; item_id pode ser NULL mas joins ocorrem)
CREATE INDEX IF NOT EXISTS ec_lm_item_id_idx
  ON public.ec_lista_materiais (item_id)
  WHERE item_id IS NOT NULL;

-- ec_solucao_kits: par solucao_id + kit_id para lookups do motor
CREATE INDEX IF NOT EXISTS ec_sk_solucao_kit_idx
  ON public.ec_solucao_kits (solucao_id, kit_id);

-- ec_historico_versoes: busca por proposta + created_at desc (listagem de histórico)
CREATE INDEX IF NOT EXISTS ec_hist_proposta_data_idx
  ON public.ec_historico_versoes (proposta_id, created_at DESC);

-- ec_visao_executiva é uma view — seus JOINs são cobertos pelos índices nas tabelas base.
-- Índice mais importante para a view: ec_propostas.pipeline_id (já existe).
-- ec_precificacao.versao_id é UNIQUE (cria índice implícito).

-- Comentários de diagnóstico:
-- Use EXPLAIN ANALYZE nas queries abaixo para verificar uso dos índices:
--   SELECT * FROM ec_versoes WHERE proposta_id = '...' AND necessita_recalculo = true;
--   SELECT * FROM ec_historico_versoes WHERE proposta_id = '...' ORDER BY created_at DESC;
--   SELECT * FROM ec_solucao_kits WHERE solucao_id IN (...);
