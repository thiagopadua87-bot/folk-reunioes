-- ============================================================
-- Folk Reuniões — Engenharia Comercial: Fase 5 — necessita_recalculo
--
-- Adiciona flag em ec_versoes para indicar quando o escopo,
-- soluções ou premissas foram alterados após o último cálculo.
-- O RecalcularBanner lê esse campo para exibir alerta ao usuário.
--
-- Depende de: engenharia_comercial_fase4_proposta.sql
-- Execute ANTES de: engenharia_comercial_performance_indexes.sql
-- ============================================================

ALTER TABLE public.ec_versoes
  ADD COLUMN IF NOT EXISTS necessita_recalculo BOOLEAN NOT NULL DEFAULT false;
