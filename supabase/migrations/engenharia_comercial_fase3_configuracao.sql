-- ============================================================
-- Folk Reuniões — Engenharia Comercial: Fase 3 — Configuração
-- Tabelas: ec_parametros_financeiros, ec_templates
-- Depende da Fase 1 e 2
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 1. Parâmetros Financeiros
-- Centraliza todas as premissas financeiras do módulo.
-- Nenhum valor de negócio deve ficar fixo no código.
-- Alterações de engenharia financeira ocorrem aqui, sem deploy.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ec_parametros_financeiros (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chave        TEXT        NOT NULL UNIQUE,
  valor        NUMERIC     NOT NULL,
  descricao    TEXT        NOT NULL DEFAULT '',
  categoria    TEXT        NOT NULL DEFAULT 'geral'
               CHECK (categoria IN (
                 'impostos',
                 'margens',
                 'custos_fixos',
                 'depreciacoes',
                 'riscos',
                 'reajustes',
                 'roi',
                 'geral'
               )),
  unidade      TEXT        NOT NULL DEFAULT ''
               CHECK (unidade IN ('%', 'R$', 'meses', 'anos', 'dias', '')),
  ativo        BOOLEAN     NOT NULL DEFAULT true,
  updated_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ec_pf_categoria_idx ON public.ec_parametros_financeiros (categoria);
CREATE INDEX IF NOT EXISTS ec_pf_ativo_idx     ON public.ec_parametros_financeiros (ativo);

ALTER TABLE public.ec_parametros_financeiros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_params_le_autenticados" ON public.ec_parametros_financeiros;
CREATE POLICY "ec_params_le_autenticados" ON public.ec_parametros_financeiros
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ec_params_admin_gerencia" ON public.ec_parametros_financeiros;
CREATE POLICY "ec_params_admin_gerencia" ON public.ec_parametros_financeiros
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP TRIGGER IF EXISTS ec_parametros_updated_at ON public.ec_parametros_financeiros;
CREATE TRIGGER ec_parametros_updated_at
  BEFORE UPDATE ON public.ec_parametros_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.ec_set_updated_at();

-- Seed: parâmetros financeiros iniciais
-- Todos os valores são referência — ajustar conforme realidade da empresa
INSERT INTO public.ec_parametros_financeiros (chave, valor, descricao, categoria, unidade) VALUES

  -- Impostos
  ('iss_percentual',              5.00,  'ISS sobre serviços',                            'impostos',    '%'),
  ('pis_percentual',              0.65,  'PIS sobre faturamento',                         'impostos',    '%'),
  ('cofins_percentual',           3.00,  'COFINS sobre faturamento',                      'impostos',    '%'),
  ('ir_csll_percentual',          3.08,  'IR + CSLL (lucro presumido)',                   'impostos',    '%'),
  ('total_impostos_percentual',  11.73,  'Soma total de impostos (ISS+PIS+COFINS+IR+CSLL)','impostos',  '%'),

  -- BDI e Margens
  ('bdi_percentual',             25.00,  'BDI sobre custo de materiais',                  'margens',     '%'),
  ('margem_minima_percentual',   20.00,  'Margem mínima aceitável sem aprovação',         'margens',     '%'),
  ('margem_alvo_percentual',     30.00,  'Margem operacional alvo',                       'margens',     '%'),
  ('comissao_vendedor_percentual', 5.00, 'Comissão sobre valor vendido',                  'margens',     '%'),

  -- Custos Fixos Operacionais (mensais, por cliente)
  ('custo_monitoramento_por_cliente',   80.00, 'Custo da central de monitoramento por cliente', 'custos_fixos', 'R$'),
  ('custo_suporte_por_cliente',         35.00, 'Custo médio de suporte técnico por cliente',    'custos_fixos', 'R$'),
  ('custo_telefonia_por_cliente',       45.00, 'Custo de linha SIM/VOIP por portaria',           'custos_fixos', 'R$'),
  ('custo_licenca_software_por_cliente',20.00, 'Custo médio de licenciamento de software',       'custos_fixos', 'R$'),

  -- Depreciação e Vida Útil
  ('vida_util_equipamentos_anos',        5.00, 'Vida útil média dos equipamentos em anos',   'depreciacoes', 'anos'),
  ('taxa_depreciacao_anual_percentual', 20.00, 'Taxa de depreciação linear anual',           'depreciacoes', '%'),

  -- Risco
  ('percentual_risco_projeto',           5.00, 'Reserva de contingência sobre custo total', 'riscos',  '%'),

  -- Reajuste
  ('taxa_reajuste_anual_percentual',     6.00, 'Taxa de reajuste contratual anual (IPCA ref.)', 'reajustes', '%'),

  -- ROI
  ('periodo_roi_meses',                 24.00, 'Período de referência para cálculo de ROI',  'roi',    'meses'),
  ('payback_alvo_meses',                12.00, 'Payback máximo desejado',                    'roi',    'meses')

ON CONFLICT (chave) DO NOTHING;

-- Função auxiliar: retorna todos os parâmetros como objeto JSON
-- Uso: SELECT ec_parametros_json() → { "bdi_percentual": 25, ... }
CREATE OR REPLACE FUNCTION public.ec_parametros_json()
RETURNS JSONB AS $$
  SELECT jsonb_object_agg(chave, valor)
  FROM public.ec_parametros_financeiros
  WHERE ativo = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- 2. Templates de Projeto
-- Projetos-modelo reutilizáveis para acelerar a criação
-- de novas propostas. Armazena snapshot de dados do projeto
-- e de necessidades em JSON — independente de versão ativa.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ec_templates (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT        NOT NULL,
  descricao       TEXT        NOT NULL DEFAULT '',
  categoria       TEXT        NOT NULL DEFAULT '',
  segmento        TEXT        NOT NULL DEFAULT 'intermediario'
                  CHECK (segmento IN ('basico', 'intermediario', 'premium', 'ultra')),

  -- Snapshot de ec_projeto_dados ao salvar o template
  dados_projeto   JSONB       NOT NULL DEFAULT '{}',
  -- Exemplo:
  -- {
  --   "numero_unidades": 120,
  --   "tipo_condominio": "vertical",
  --   "numero_portarias": 2,
  --   "numero_acessos": 8,
  --   "area_total": 4500
  -- }

  -- Snapshot de ec_necessidades ao salvar o template
  necessidades    JSONB       NOT NULL DEFAULT '[]',
  -- Exemplo:
  -- [
  --   { "categoria": "CFTV", "item": "Câmera IP", "quantidade": 32, "unidade": "un" },
  --   { "categoria": "Controle de Acesso", "item": "Leitor Facial", "quantidade": 8, "unidade": "un" }
  -- ]

  -- Premissas técnicas padrão do template
  premissas       JSONB       NOT NULL DEFAULT '[]',
  -- Exemplo:
  -- [
  --   { "categoria": "video", "chave": "dias_gravacao", "valor_numerico": 30, "unidade": "dias" },
  --   { "categoria": "video", "chave": "fps", "valor_numerico": 15, "unidade": "fps" }
  -- ]

  is_publico      BOOLEAN     NOT NULL DEFAULT true,
  created_by      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ec_templates_categoria_idx  ON public.ec_templates (categoria);
CREATE INDEX IF NOT EXISTS ec_templates_segmento_idx   ON public.ec_templates (segmento);
CREATE INDEX IF NOT EXISTS ec_templates_publico_idx    ON public.ec_templates (is_publico);
CREATE INDEX IF NOT EXISTS ec_templates_criador_idx    ON public.ec_templates (created_by);

ALTER TABLE public.ec_templates ENABLE ROW LEVEL SECURITY;

-- Leitura: templates públicos para todos; privados apenas para o criador e admin
DROP POLICY IF EXISTS "ec_templates_le_publicos" ON public.ec_templates;
CREATE POLICY "ec_templates_le_publicos" ON public.ec_templates
  FOR SELECT TO authenticated
  USING (
    is_publico = true
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Criação: qualquer autenticado pode criar template
DROP POLICY IF EXISTS "ec_templates_insere_autenticados" ON public.ec_templates;
CREATE POLICY "ec_templates_insere_autenticados" ON public.ec_templates
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Edição e exclusão: criador ou admin
DROP POLICY IF EXISTS "ec_templates_edita_criador_admin" ON public.ec_templates;
CREATE POLICY "ec_templates_edita_criador_admin" ON public.ec_templates
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "ec_templates_exclui_criador_admin" ON public.ec_templates;
CREATE POLICY "ec_templates_exclui_criador_admin" ON public.ec_templates
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP TRIGGER IF EXISTS ec_templates_updated_at ON public.ec_templates;
CREATE TRIGGER ec_templates_updated_at
  BEFORE UPDATE ON public.ec_templates
  FOR EACH ROW EXECUTE FUNCTION public.ec_set_updated_at();
