-- ============================================================
-- Folk Reuniões — Engenharia Comercial: Fase 4 — Proposta / Versão
-- Tabelas: ec_propostas, ec_versoes, ec_projeto_dados,
--          ec_necessidades, ec_premissas, ec_versao_solucoes,
--          ec_custos_proposta, ec_lista_materiais,
--          ec_precificacao, ec_historico_versoes
-- Depende das Fases 1, 2 e 3
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 1. Propostas
-- Cada proposta representa uma solução distinta para uma
-- oportunidade do pipeline (ex: "Portaria Remota", "CFTV Premium").
-- Um pipeline pode ter múltiplas propostas simultâneas.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ec_propostas (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id  UUID        NOT NULL REFERENCES public.pipeline(id)
               ON DELETE CASCADE,
  nome         TEXT        NOT NULL,
  descricao    TEXT        NOT NULL DEFAULT '',
  status       TEXT        NOT NULL DEFAULT 'rascunho'
               CHECK (status IN ('rascunho', 'ativa', 'encerrada', 'cancelada')),
  created_by   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ec_propostas_pipeline_idx    ON public.ec_propostas (pipeline_id);
CREATE INDEX IF NOT EXISTS ec_propostas_status_idx      ON public.ec_propostas (status);
CREATE INDEX IF NOT EXISTS ec_propostas_created_by_idx  ON public.ec_propostas (created_by);

ALTER TABLE public.ec_propostas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_propostas_le_autenticados" ON public.ec_propostas;
CREATE POLICY "ec_propostas_le_autenticados" ON public.ec_propostas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ec_propostas_insere_autenticados" ON public.ec_propostas;
CREATE POLICY "ec_propostas_insere_autenticados" ON public.ec_propostas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "ec_propostas_atualiza" ON public.ec_propostas;
CREATE POLICY "ec_propostas_atualiza" ON public.ec_propostas
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "ec_propostas_exclui_admin" ON public.ec_propostas;
CREATE POLICY "ec_propostas_exclui_admin" ON public.ec_propostas
  FOR DELETE TO authenticated
  USING (public.is_admin());

DROP TRIGGER IF EXISTS ec_propostas_updated_at ON public.ec_propostas;
CREATE TRIGGER ec_propostas_updated_at
  BEFORE UPDATE ON public.ec_propostas
  FOR EACH ROW EXECUTE FUNCTION public.ec_set_updated_at();

-- ============================================================
-- 2. Versões
-- Cada revisão de uma proposta gera uma nova versão.
-- Somente uma versão pode estar marcada como is_current.
-- O fluxo de aprovação ocorre aqui (status + aprovacao_excecao).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ec_versoes (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id        UUID        NOT NULL REFERENCES public.ec_propostas(id)
                     ON DELETE CASCADE,
  numero             INT         NOT NULL CHECK (numero > 0),
  motivo_revisao     TEXT        NOT NULL DEFAULT '',
  is_current         BOOLEAN     NOT NULL DEFAULT true,
  status             TEXT        NOT NULL DEFAULT 'rascunho'
                     CHECK (status IN (
                       'rascunho',
                       'calculado',
                       'aguardando_aprovacao',
                       'aprovacao_concedida',
                       'aprovacao_negada',
                       'enviada',
                       'aprovada_cliente',
                       'recusada'
                     )),
  aprovacao_excecao  JSONB,
  -- { "aprovador_id": "uuid", "aprovador_nome": "...",
  --   "motivo": "...", "aprovado_em": "2026-07-23T..." }
  created_by         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (proposta_id, numero)
);

CREATE INDEX IF NOT EXISTS ec_versoes_proposta_idx   ON public.ec_versoes (proposta_id);
CREATE INDEX IF NOT EXISTS ec_versoes_status_idx     ON public.ec_versoes (status);
CREATE INDEX IF NOT EXISTS ec_versoes_current_idx    ON public.ec_versoes (proposta_id, is_current)
  WHERE is_current = true;

ALTER TABLE public.ec_versoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_versoes_le_autenticados" ON public.ec_versoes;
CREATE POLICY "ec_versoes_le_autenticados" ON public.ec_versoes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ec_versoes_insere_autenticados" ON public.ec_versoes;
CREATE POLICY "ec_versoes_insere_autenticados" ON public.ec_versoes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "ec_versoes_atualiza" ON public.ec_versoes;
CREATE POLICY "ec_versoes_atualiza" ON public.ec_versoes
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "ec_versoes_exclui_admin" ON public.ec_versoes;
CREATE POLICY "ec_versoes_exclui_admin" ON public.ec_versoes
  FOR DELETE TO authenticated USING (public.is_admin());

DROP TRIGGER IF EXISTS ec_versoes_updated_at ON public.ec_versoes;
CREATE TRIGGER ec_versoes_updated_at
  BEFORE UPDATE ON public.ec_versoes
  FOR EACH ROW EXECUTE FUNCTION public.ec_set_updated_at();

-- Garante apenas uma versão is_current por proposta
CREATE OR REPLACE FUNCTION public.ec_enforce_single_current_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE public.ec_versoes
    SET    is_current = false
    WHERE  proposta_id = NEW.proposta_id
      AND  id          <> NEW.id
      AND  is_current  = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ec_versoes_single_current ON public.ec_versoes;
CREATE TRIGGER ec_versoes_single_current
  AFTER INSERT OR UPDATE OF is_current ON public.ec_versoes
  FOR EACH ROW
  WHEN (NEW.is_current = true)
  EXECUTE FUNCTION public.ec_enforce_single_current_version();

-- ============================================================
-- 3. Dados do Projeto
-- Informações técnicas do escopo por versão.
-- Um registro por versão (UNIQUE versao_id).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ec_projeto_dados (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  versao_id         UUID        NOT NULL UNIQUE REFERENCES public.ec_versoes(id)
                    ON DELETE CASCADE,
  numero_unidades   INT         NOT NULL DEFAULT 0 CHECK (numero_unidades >= 0),
  tipo_condominio   TEXT        NOT NULL DEFAULT ''
                    CHECK (tipo_condominio IN (
                      '', 'vertical', 'horizontal', 'misto',
                      'comercial', 'industrial', 'outro'
                    )),
  numero_portarias  INT         NOT NULL DEFAULT 0 CHECK (numero_portarias >= 0),
  numero_acessos    INT         NOT NULL DEFAULT 0 CHECK (numero_acessos >= 0),
  numero_elevadores INT         NOT NULL DEFAULT 0 CHECK (numero_elevadores >= 0),
  area_total        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (area_total >= 0),
  observacoes       TEXT        NOT NULL DEFAULT '',
  dados_extras      JSONB       NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ec_projeto_dados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_proj_dados_le_autenticados" ON public.ec_projeto_dados;
CREATE POLICY "ec_proj_dados_le_autenticados" ON public.ec_projeto_dados
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ec_proj_dados_escreve_autenticados" ON public.ec_projeto_dados;
CREATE POLICY "ec_proj_dados_escreve_autenticados" ON public.ec_projeto_dados
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS ec_projeto_dados_updated_at ON public.ec_projeto_dados;
CREATE TRIGGER ec_projeto_dados_updated_at
  BEFORE UPDATE ON public.ec_projeto_dados
  FOR EACH ROW EXECUTE FUNCTION public.ec_set_updated_at();

-- ============================================================
-- 4. Necessidades
-- O que o cliente precisa — estruturado por categoria + item.
-- Alimenta o motor de composição.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ec_necessidades (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  versao_id   UUID          NOT NULL REFERENCES public.ec_versoes(id) ON DELETE CASCADE,
  categoria   TEXT          NOT NULL,
  item        TEXT          NOT NULL,
  quantidade  NUMERIC(10,3) NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  unidade     TEXT          NOT NULL DEFAULT 'un',
  observacao  TEXT          NOT NULL DEFAULT '',
  ordem       INT           NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ec_necessidades_versao_idx     ON public.ec_necessidades (versao_id);
CREATE INDEX IF NOT EXISTS ec_necessidades_categoria_idx  ON public.ec_necessidades (categoria);

ALTER TABLE public.ec_necessidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_necessidades_le_autenticados" ON public.ec_necessidades;
CREATE POLICY "ec_necessidades_le_autenticados" ON public.ec_necessidades
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ec_necessidades_escreve_autenticados" ON public.ec_necessidades;
CREATE POLICY "ec_necessidades_escreve_autenticados" ON public.ec_necessidades
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 5. Premissas Técnicas
-- Parâmetros de engenharia por versão: dias de gravação, FPS,
-- disponibilidade, redundância, etc. O motor usa essas
-- premissas para dimensionar automaticamente o BOM.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ec_premissas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  versao_id       UUID        NOT NULL REFERENCES public.ec_versoes(id) ON DELETE CASCADE,
  categoria       TEXT        NOT NULL DEFAULT 'geral'
                  CHECK (categoria IN (
                    'video', 'rede', 'disponibilidade',
                    'capacidade', 'energia', 'acesso', 'geral'
                  )),
  chave           TEXT        NOT NULL,
  valor_numerico  NUMERIC,
  valor_texto     TEXT        NOT NULL DEFAULT '',
  unidade         TEXT        NOT NULL DEFAULT '',
  descricao       TEXT        NOT NULL DEFAULT '',
  impacto         TEXT        NOT NULL DEFAULT '',
  ordem           INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (versao_id, chave),
  CONSTRAINT ec_premissas_valor_required
    CHECK (valor_numerico IS NOT NULL OR valor_texto <> '')
);

CREATE INDEX IF NOT EXISTS ec_premissas_versao_idx    ON public.ec_premissas (versao_id);
CREATE INDEX IF NOT EXISTS ec_premissas_categoria_idx ON public.ec_premissas (categoria);

ALTER TABLE public.ec_premissas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_premissas_le_autenticados" ON public.ec_premissas;
CREATE POLICY "ec_premissas_le_autenticados" ON public.ec_premissas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ec_premissas_escreve_autenticados" ON public.ec_premissas;
CREATE POLICY "ec_premissas_escreve_autenticados" ON public.ec_premissas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 6. Soluções por Versão
-- Qual abordagem técnica foi escolhida para cada categoria
-- de necessidade nesta versão da proposta.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ec_versao_solucoes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  versao_id   UUID        NOT NULL REFERENCES public.ec_versoes(id) ON DELETE CASCADE,
  categoria   TEXT        NOT NULL,
  solucao_id  UUID        NOT NULL REFERENCES public.ec_solucoes(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (versao_id, categoria)
);

CREATE INDEX IF NOT EXISTS ec_vs_versao_idx   ON public.ec_versao_solucoes (versao_id);
CREATE INDEX IF NOT EXISTS ec_vs_solucao_idx  ON public.ec_versao_solucoes (solucao_id);

ALTER TABLE public.ec_versao_solucoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_vs_le_autenticados" ON public.ec_versao_solucoes;
CREATE POLICY "ec_vs_le_autenticados" ON public.ec_versao_solucoes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ec_vs_escreve_autenticados" ON public.ec_versao_solucoes;
CREATE POLICY "ec_vs_escreve_autenticados" ON public.ec_versao_solucoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 7. Custos da Proposta
-- Despesas que não pertencem à lista de materiais:
-- frete, deslocamento, cloud, mão de obra, monitoramento...
-- Separados por tipo (único ou recorrente).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ec_custos_proposta (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  versao_id     UUID          NOT NULL REFERENCES public.ec_versoes(id) ON DELETE CASCADE,
  categoria     TEXT          NOT NULL
                CHECK (categoria IN (
                  'frete', 'hospedagem', 'deslocamento', 'cloud',
                  'monitoramento', 'mao_de_obra', 'telefonia',
                  'treinamento', 'garantia_estendida', 'outros'
                )),
  descricao     TEXT          NOT NULL,
  tipo_custo    TEXT          NOT NULL
                CHECK (tipo_custo IN ('unico', 'mensal', 'anual')),
  valor         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
  fornecedor_id UUID          REFERENCES public.ec_fornecedores(id) ON DELETE SET NULL,
  observacoes   TEXT          NOT NULL DEFAULT '',
  ordem         INT           NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ec_cp_versao_idx    ON public.ec_custos_proposta (versao_id);
CREATE INDEX IF NOT EXISTS ec_cp_categoria_idx ON public.ec_custos_proposta (categoria);
CREATE INDEX IF NOT EXISTS ec_cp_tipo_idx      ON public.ec_custos_proposta (tipo_custo);

ALTER TABLE public.ec_custos_proposta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_cp_le_autenticados" ON public.ec_custos_proposta;
CREATE POLICY "ec_cp_le_autenticados" ON public.ec_custos_proposta
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ec_cp_escreve_autenticados" ON public.ec_custos_proposta;
CREATE POLICY "ec_cp_escreve_autenticados" ON public.ec_custos_proposta
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 8. Lista de Materiais
-- BOM gerado pelo motor — imutável após cálculo.
-- Snapshots de produto e fornecedor preservam o estado exato
-- no momento da geração, independente de alterações futuras
-- no catálogo ou na tabela de preços.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ec_lista_materiais (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  versao_id           UUID          NOT NULL REFERENCES public.ec_versoes(id) ON DELETE CASCADE,
  item_id             UUID          REFERENCES public.ec_catalogo_itens(id) ON DELETE SET NULL,
  item_snapshot       JSONB         NOT NULL DEFAULT '{}',
  -- { "nome": "Câmera IP 2MP", "codigo": "VIP-1230",
  --   "tipo": "produto", "unidade": "un",
  --   "categoria": "CFTV", "fabricante": "Intelbras" }
  quantidade          NUMERIC(10,3) NOT NULL CHECK (quantidade > 0),
  custo_unitario      NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (custo_unitario >= 0),
  custo_total         NUMERIC(12,2) GENERATED ALWAYS AS (quantidade * custo_unitario) STORED,
  fornecedor_id       UUID          REFERENCES public.ec_fornecedores(id) ON DELETE SET NULL,
  fornecedor_snapshot JSONB         NOT NULL DEFAULT '{}',
  -- { "nome": "Distribuidora XYZ", "preco_unitario": 298.00,
  --   "data_preco": "2026-07-23", "prazo_entrega_dias": 5 }
  origem              TEXT          NOT NULL DEFAULT 'kit'
                      CHECK (origem IN ('kit', 'regra', 'manual')),
  origem_nome         TEXT          NOT NULL DEFAULT '',
  observacoes         TEXT          NOT NULL DEFAULT '',
  ordem               INT           NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ec_lm_versao_idx  ON public.ec_lista_materiais (versao_id);
CREATE INDEX IF NOT EXISTS ec_lm_item_idx    ON public.ec_lista_materiais (item_id);
CREATE INDEX IF NOT EXISTS ec_lm_origem_idx  ON public.ec_lista_materiais (origem);

ALTER TABLE public.ec_lista_materiais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_lm_le_autenticados" ON public.ec_lista_materiais;
CREATE POLICY "ec_lm_le_autenticados" ON public.ec_lista_materiais
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ec_lm_escreve_autenticados" ON public.ec_lista_materiais;
CREATE POLICY "ec_lm_escreve_autenticados" ON public.ec_lista_materiais
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 9. Precificação
-- Resultado financeiro calculado por versão.
-- Um registro por versão (UNIQUE versao_id).
-- memorial_calculo registra cada etapa do cálculo e os
-- parâmetros utilizados — rastreabilidade completa.
-- requires_approval = true quando margem < margem_minima.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ec_precificacao (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  versao_id                UUID          NOT NULL UNIQUE REFERENCES public.ec_versoes(id)
                           ON DELETE CASCADE,

  -- Custos base
  custo_total_materiais    NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_instalacao         NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_outros_unicos      NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Parâmetros aplicados
  bdi_aplicado             NUMERIC(5,2)  NOT NULL DEFAULT 0,
  impostos_aplicados       NUMERIC(5,2)  NOT NULL DEFAULT 0,

  -- Resultado implantação
  valor_implantacao        NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Recorrência
  custo_mensal_operacional NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_mensal_adicional   NUMERIC(12,2) NOT NULL DEFAULT 0,
  margem_aplicada          NUMERIC(5,2)  NOT NULL DEFAULT 0,
  valor_mensal             NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Auditoria do cálculo
  memorial_calculo         JSONB         NOT NULL DEFAULT '{}',
  -- {
  --   "parametros_utilizados": { "bdi": 25, "iss": 5, ... },
  --   "etapas": [
  --     { "etapa": "Custo materiais",    "valor": 45000 },
  --     { "etapa": "+ BDI 25%",          "valor": 11250 },
  --     { "etapa": "+ Impostos 11,73%",  "valor":  6624 },
  --     { "etapa": "= Valor implantação","valor": 62874 }
  --   ],
  --   "margem_calculada": 28.5,
  --   "margem_minima":    20.0,
  --   "aprovacao_necessaria": false
  -- }

  requires_approval        BOOLEAN       NOT NULL DEFAULT false,
  calculated_at            TIMESTAMPTZ,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE public.ec_precificacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_prec_le_autenticados" ON public.ec_precificacao;
CREATE POLICY "ec_prec_le_autenticados" ON public.ec_precificacao
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ec_prec_escreve_autenticados" ON public.ec_precificacao;
CREATE POLICY "ec_prec_escreve_autenticados" ON public.ec_precificacao
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS ec_precificacao_updated_at ON public.ec_precificacao;
CREATE TRIGGER ec_precificacao_updated_at
  BEFORE UPDATE ON public.ec_precificacao
  FOR EACH ROW EXECUTE FUNCTION public.ec_set_updated_at();

-- Ao salvar precificação, atualiza status da versão automaticamente
CREATE OR REPLACE FUNCTION public.ec_sync_versao_status_from_precificacao()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.requires_approval = true THEN
    UPDATE public.ec_versoes
    SET    status = 'aguardando_aprovacao', updated_at = now()
    WHERE  id = NEW.versao_id AND status = 'rascunho';
  ELSE
    UPDATE public.ec_versoes
    SET    status = 'calculado', updated_at = now()
    WHERE  id = NEW.versao_id AND status = 'rascunho';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ec_prec_sync_status ON public.ec_precificacao;
CREATE TRIGGER ec_prec_sync_status
  AFTER INSERT OR UPDATE ON public.ec_precificacao
  FOR EACH ROW EXECUTE FUNCTION public.ec_sync_versao_status_from_precificacao();

-- ============================================================
-- 10. Histórico de Versões
-- Log de eventos por versão: criada, calculada, aprovada...
-- Alimentado pela aplicação e por triggers de status.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ec_historico_versoes (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  versao_id         UUID        NOT NULL REFERENCES public.ec_versoes(id) ON DELETE CASCADE,
  proposta_id       UUID        NOT NULL REFERENCES public.ec_propostas(id) ON DELETE CASCADE,
  evento            TEXT        NOT NULL
                    CHECK (evento IN (
                      'criada',
                      'calculada',
                      'aguardando_aprovacao',
                      'aprovacao_concedida',
                      'aprovacao_negada',
                      'enviada',
                      'aprovada_cliente',
                      'recusada',
                      'convertida_venda',
                      'editada'
                    )),
  descricao         TEXT        NOT NULL DEFAULT '',
  dados_anteriores  JSONB,
  dados_novos       JSONB,
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ec_hist_versao_idx   ON public.ec_historico_versoes (versao_id);
CREATE INDEX IF NOT EXISTS ec_hist_proposta_idx ON public.ec_historico_versoes (proposta_id);
CREATE INDEX IF NOT EXISTS ec_hist_evento_idx   ON public.ec_historico_versoes (evento);
CREATE INDEX IF NOT EXISTS ec_hist_user_idx     ON public.ec_historico_versoes (user_id);

ALTER TABLE public.ec_historico_versoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_hist_le_autenticados" ON public.ec_historico_versoes;
CREATE POLICY "ec_hist_le_autenticados" ON public.ec_historico_versoes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ec_hist_insere_autenticados" ON public.ec_historico_versoes;
CREATE POLICY "ec_hist_insere_autenticados" ON public.ec_historico_versoes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Log automático ao mudar status de uma versão
CREATE OR REPLACE FUNCTION public.ec_log_versao_status()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.ec_historico_versoes
      (versao_id, proposta_id, evento, descricao, dados_anteriores, dados_novos, user_id)
    VALUES (
      NEW.id,
      NEW.proposta_id,
      NEW.status,
      'Status alterado de ' || OLD.status || ' para ' || NEW.status,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      COALESCE(auth.uid(), NEW.created_by)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ec_versoes_log_status ON public.ec_versoes;
CREATE TRIGGER ec_versoes_log_status
  AFTER UPDATE OF status ON public.ec_versoes
  FOR EACH ROW EXECUTE FUNCTION public.ec_log_versao_status();

-- ============================================================
-- 11. Visão Executiva
-- View calculada com KPIs consolidados por versão.
-- Nunca armazenada — sempre reflete o estado atual.
-- ============================================================
CREATE OR REPLACE VIEW public.ec_visao_executiva AS
SELECT
  v.id                                    AS versao_id,
  v.numero                                AS versao_numero,
  v.status                                AS versao_status,
  v.is_current,
  p.id                                    AS proposta_id,
  p.nome                                  AS proposta_nome,
  p.status                                AS proposta_status,
  pip.id                                  AS pipeline_id,
  pip.cliente,

  -- Investimento e recorrência
  pr.valor_implantacao,
  pr.valor_mensal,
  pr.margem_aplicada                      AS margem_pct,
  pr.custo_total_materiais,
  pr.custo_mensal_operacional,
  pr.requires_approval,

  -- Custos adicionais da proposta
  COALESCE(cp_m.total_mensal,  0)         AS custos_mensais_adicionais,
  COALESCE(cp_u.total_unico,   0)         AS custos_unicos_adicionais,

  -- Custo mensal total (operacional + adicionais)
  (pr.custo_mensal_operacional + COALESCE(cp_m.total_mensal, 0))
                                          AS custo_mensal_total,

  -- Lucro mensal líquido
  (pr.valor_mensal
    - pr.custo_mensal_operacional
    - COALESCE(cp_m.total_mensal, 0))     AS lucro_mensal,

  -- Payback em meses
  CASE
    WHEN (pr.valor_mensal - pr.custo_mensal_operacional - COALESCE(cp_m.total_mensal, 0)) > 0
    THEN ROUND(
      pr.valor_implantacao /
      (pr.valor_mensal - pr.custo_mensal_operacional - COALESCE(cp_m.total_mensal, 0))
    , 1)
    ELSE NULL
  END                                     AS payback_meses,

  -- Lucro projetado no período de ROI configurado
  (pr.valor_mensal
    - pr.custo_mensal_operacional
    - COALESCE(cp_m.total_mensal, 0))
    * pf.periodo_roi                      AS lucro_projetado,

  -- ROI %
  CASE
    WHEN pr.valor_implantacao > 0
    THEN ROUND(
      (
        (pr.valor_mensal - pr.custo_mensal_operacional - COALESCE(cp_m.total_mensal, 0))
        * pf.periodo_roi - pr.valor_implantacao
      ) / pr.valor_implantacao * 100
    , 1)
    ELSE NULL
  END                                     AS roi_pct,

  -- Aprovação de exceção
  v.aprovacao_excecao,
  pr.calculated_at,
  pr.memorial_calculo

FROM public.ec_versoes v
JOIN public.ec_propostas p         ON p.id  = v.proposta_id
JOIN public.pipeline pip           ON pip.id = p.pipeline_id
LEFT JOIN public.ec_precificacao pr ON pr.versao_id = v.id
LEFT JOIN (
  SELECT versao_id, SUM(valor) AS total_mensal
  FROM   public.ec_custos_proposta
  WHERE  tipo_custo = 'mensal'
  GROUP  BY versao_id
) cp_m ON cp_m.versao_id = v.id
LEFT JOIN (
  SELECT versao_id, SUM(valor) AS total_unico
  FROM   public.ec_custos_proposta
  WHERE  tipo_custo = 'unico'
  GROUP  BY versao_id
) cp_u ON cp_u.versao_id = v.id
CROSS JOIN (
  SELECT valor AS periodo_roi
  FROM   public.ec_parametros_financeiros
  WHERE  chave = 'periodo_roi_meses' AND ativo = true
  LIMIT  1
) pf;
