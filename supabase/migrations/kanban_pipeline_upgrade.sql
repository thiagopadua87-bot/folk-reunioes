-- ============================================================
-- Kanban Pipeline Upgrade
-- 1. Novos campos de acompanhamento comercial
-- 2. Tabela crm_agenda_sync (para futura integração Google Calendar)
-- 3. Migração de status antigos para novos
-- ============================================================

-- ── 1. Novos campos na tabela pipeline ──────────────────────

ALTER TABLE public.pipeline
  ADD COLUMN IF NOT EXISTS proxima_acao_datahora    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS proxima_acao_tipo         TEXT,
  ADD COLUMN IF NOT EXISTS proxima_acao_descricao    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS google_event_id           TEXT,
  ADD COLUMN IF NOT EXISTS google_sync_status        TEXT NOT NULL DEFAULT 'nao_sincronizado';

CREATE INDEX IF NOT EXISTS idx_pipeline_proxima_acao
  ON public.pipeline (proxima_acao_datahora)
  WHERE proxima_acao_datahora IS NOT NULL;

-- ── 2. Tabela crm_agenda_sync ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.crm_agenda_sync (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id           UUID        NOT NULL REFERENCES public.pipeline(id) ON DELETE CASCADE,
  vendedor_id           UUID        REFERENCES public.vendedores(id) ON DELETE SET NULL,
  google_event_id       TEXT,
  ultima_sincronizacao  TIMESTAMPTZ,
  status                TEXT        NOT NULL DEFAULT 'pendente',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.crm_agenda_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso crm_agenda_sync" ON public.crm_agenda_sync
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pipeline p
      WHERE p.id = proposta_id
        AND (p.user_id = auth.uid() OR public.is_admin())
    )
  );

-- ── 3. Migração de status ────────────────────────────────────

-- Remover constraint existente sobre status
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name   = 'pipeline'
      AND tc.constraint_type = 'CHECK'
      AND tc.constraint_name LIKE '%status%'
  LOOP
    EXECUTE 'ALTER TABLE public.pipeline DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
  END LOOP;
END $$;

-- Migrar valores antigos → novos
UPDATE public.pipeline SET status = 'apresentacao_empresa'  WHERE status = 'apresentacao';
UPDATE public.pipeline SET status = 'proposta_analise'      WHERE status = 'em_analise';
UPDATE public.pipeline SET status = 'assinatura_contrato'   WHERE status = 'assinatura';
UPDATE public.pipeline SET status = 'fechado'               WHERE status = 'fechado_ganho';
-- 'declinado' permanece igual

-- Adicionar novo constraint com os 7 status do Kanban
ALTER TABLE public.pipeline
  ADD CONSTRAINT pipeline_status_check
  CHECK (status IN (
    'lead_cadastrado',
    'apresentacao_empresa',
    'proposta_analise',
    'assembleia_marcada',
    'assinatura_contrato',
    'fechado',
    'declinado'
  ));
