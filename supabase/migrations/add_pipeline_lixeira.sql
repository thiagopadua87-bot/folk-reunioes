-- Lixeira do pipeline: guarda snapshot completo antes da exclusão

CREATE TABLE IF NOT EXISTS public.pipeline_lixeira (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id             UUID NOT NULL,
  user_id                 UUID NOT NULL,

  -- Snapshot dos campos principais
  cliente                 TEXT,
  cnpj                    TEXT,
  status                  TEXT,
  temperatura             TEXT,
  vendedor_id             UUID,
  vendedor_nome           TEXT,
  indicado_por            TEXT,
  observacoes             TEXT,
  servicos                TEXT[],
  valor_implantacao       NUMERIC,
  valor_mensal            NUMERIC,
  data_inicio_lead        DATE,
  sindico_gestor_id       UUID,
  winner_competitor_id    UUID,
  loss_reason             TEXT,
  proxima_acao_datahora   TIMESTAMPTZ,
  proxima_acao_tipo       TEXT,
  proxima_acao_descricao  TEXT,
  data_assembleia         TIMESTAMPTZ,
  ultima_interacao        TIMESTAMPTZ,
  convertido_em_venda     BOOLEAN,
  venda_id                UUID,

  -- Auditoria da exclusão
  excluido_em             TIMESTAMPTZ NOT NULL DEFAULT now(),
  excluido_por_nome       TEXT,

  pipeline_created_at     TIMESTAMPTZ
);

ALTER TABLE public.pipeline_lixeira ENABLE ROW LEVEL SECURITY;

-- Somente admin lê; qualquer usuário aprovado pode inserir (via service role na função)
CREATE POLICY "admin_le_lixeira" ON public.pipeline_lixeira
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "usuario_insere_lixeira" ON public.pipeline_lixeira
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS pipeline_lixeira_pipeline_id_idx ON public.pipeline_lixeira(pipeline_id);
CREATE INDEX IF NOT EXISTS pipeline_lixeira_excluido_em_idx  ON public.pipeline_lixeira(excluido_em DESC);
