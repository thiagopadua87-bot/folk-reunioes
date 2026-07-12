-- ============================================================
-- MÓDULO DE COMISSÕES — MIGRATION COMPLETA (idempotente)
-- ============================================================

-- 1. Novos campos em vendedores
ALTER TABLE public.vendedores
  ADD COLUMN IF NOT EXISTS tipo       text NOT NULL DEFAULT 'consultor'
    CHECK (tipo IN ('consultor', 'gerente', 'outro')),
  ADD COLUMN IF NOT EXISTS gerente_id uuid REFERENCES public.vendedores(id) ON DELETE SET NULL;

-- 2. Novos campos em vendas
ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS indicador_id      uuid REFERENCES public.vendedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gerente_id        uuid REFERENCES public.vendedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contrato_assinado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS primeira_nf       boolean NOT NULL DEFAULT false;

-- 3. Regras de comissionamento (configuráveis)
CREATE TABLE IF NOT EXISTS public.comissoes_regras (
  id                          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                        text         NOT NULL,
  tipo_servico                text         NOT NULL DEFAULT 'demais'
    CHECK (tipo_servico IN ('portaria_remota', 'demais', 'venda_direta')),
  percentual_consultor        numeric(5,2) NOT NULL DEFAULT 0,
  percentual_consultor_impl   numeric(5,2) NOT NULL DEFAULT 0,
  percentual_gerente          numeric(5,2) NOT NULL DEFAULT 0,
  percentual_gerente_proprio  numeric(5,2) NOT NULL DEFAULT 0,
  percentual_indicador        numeric(5,2) NOT NULL DEFAULT 0,
  meses_recorrencia           integer      NOT NULL DEFAULT 1,
  ativo                       boolean      NOT NULL DEFAULT true,
  vigencia_inicio             date,
  vigencia_fim                date,
  observacoes                 text         NOT NULL DEFAULT '',
  created_at                  timestamptz  NOT NULL DEFAULT now(),
  updated_at                  timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.comissoes_regras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_comissoes_regras"    ON public.comissoes_regras;
DROP POLICY IF EXISTS "admin_manage_comissoes_regras" ON public.comissoes_regras;

CREATE POLICY "auth_read_comissoes_regras" ON public.comissoes_regras
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_manage_comissoes_regras" ON public.comissoes_regras
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO public.comissoes_regras
  (nome, tipo_servico, percentual_consultor, percentual_consultor_impl,
   percentual_gerente, percentual_gerente_proprio, percentual_indicador, meses_recorrencia)
VALUES
  ('Portaria Remota', 'portaria_remota', 50, 8, 10, 50, 50, 1),
  ('Demais Serviços', 'demais',         100, 8, 10, 50, 50, 1),
  ('Venda Direta',    'venda_direta',     5, 0,  0,  0,  0, 0)
ON CONFLICT DO NOTHING;

-- 4. Competências comerciais
CREATE TABLE IF NOT EXISTS public.competencias_comissao (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia           text        NOT NULL UNIQUE,
  ano                   integer     NOT NULL,
  mes                   integer     NOT NULL CHECK (mes BETWEEN 1 AND 12),
  data_inicio           date        NOT NULL,
  data_fim              date        NOT NULL,
  status                text        NOT NULL DEFAULT 'aberta'
    CHECK (status IN (
      'aberta', 'em_conferencia', 'aguardando_aprovacao',
      'aprovada', 'enviada_financeiro', 'paga', 'fechada'
    )),
  data_aprovacao        timestamptz,
  aprovado_por          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  data_envio_financeiro timestamptz,
  enviado_por           uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  data_pagamento        timestamptz,
  pago_por              uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  observacoes           text        NOT NULL DEFAULT '',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Adicionar colunas ano/mes se a tabela já existia sem elas
ALTER TABLE public.competencias_comissao
  ADD COLUMN IF NOT EXISTS ano integer,
  ADD COLUMN IF NOT EXISTS mes integer;

ALTER TABLE public.competencias_comissao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_competencias"    ON public.competencias_comissao;
DROP POLICY IF EXISTS "admin_manage_competencias" ON public.competencias_comissao;

CREATE POLICY "auth_read_competencias" ON public.competencias_comissao
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_manage_competencias" ON public.competencias_comissao
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 5. Comissões individuais
CREATE TABLE IF NOT EXISTS public.comissoes (
  id                   uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id             uuid         NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  vendedor_id          uuid         NOT NULL REFERENCES public.vendedores(id),
  tipo_beneficiario    text         NOT NULL
    CHECK (tipo_beneficiario IN ('consultor', 'gerente', 'indicador')),
  regra_id             uuid         REFERENCES public.comissoes_regras(id) ON DELETE SET NULL,
  competencia          text,
  valor_base_mensal    numeric(12,2) NOT NULL DEFAULT 0,
  valor_base_impl      numeric(12,2) NOT NULL DEFAULT 0,
  percentual_mensal    numeric(5,2)  NOT NULL DEFAULT 0,
  percentual_impl      numeric(5,2)  NOT NULL DEFAULT 0,
  comissao_mensal      numeric(12,2) NOT NULL DEFAULT 0,
  comissao_impl        numeric(12,2) NOT NULL DEFAULT 0,
  comissao_total       numeric(12,2) NOT NULL DEFAULT 0,
  status               text         NOT NULL DEFAULT 'aguardando_liberacao'
    CHECK (status IN (
      'aguardando_liberacao', 'elegivel', 'na_competencia',
      'aprovada', 'paga', 'cancelada'
    )),
  motivo_cancelamento  text,
  aprovado_por         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  data_aprovacao       timestamptz,
  pago_por             uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  data_pagamento       timestamptz,
  observacoes          text         NOT NULL DEFAULT '',
  created_at           timestamptz  NOT NULL DEFAULT now(),
  updated_at           timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT comissoes_venda_beneficiario_unique UNIQUE (venda_id, tipo_beneficiario)
);

ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_comissoes"    ON public.comissoes;
DROP POLICY IF EXISTS "admin_manage_comissoes" ON public.comissoes;

CREATE POLICY "auth_read_comissoes" ON public.comissoes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_manage_comissoes" ON public.comissoes
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. Auditoria
CREATE TABLE IF NOT EXISTS public.comissoes_audit (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  realizado_por uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  entidade      text        NOT NULL,
  entidade_id   uuid        NOT NULL,
  acao          text        NOT NULL,
  dados_antes   jsonb,
  dados_depois  jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.comissoes_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_comissoes_audit"  ON public.comissoes_audit;
DROP POLICY IF EXISTS "auth_insert_comissoes_audit" ON public.comissoes_audit;

CREATE POLICY "admin_read_comissoes_audit" ON public.comissoes_audit
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "auth_insert_comissoes_audit" ON public.comissoes_audit
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Índices
CREATE INDEX IF NOT EXISTS comissoes_venda_id_idx       ON public.comissoes(venda_id);
CREATE INDEX IF NOT EXISTS comissoes_vendedor_id_idx    ON public.comissoes(vendedor_id);
CREATE INDEX IF NOT EXISTS comissoes_competencia_idx    ON public.comissoes(competencia);
CREATE INDEX IF NOT EXISTS comissoes_status_idx         ON public.comissoes(status);
CREATE INDEX IF NOT EXISTS competencias_ano_mes_idx     ON public.competencias_comissao(ano, mes);
CREATE INDEX IF NOT EXISTS competencias_ano_idx         ON public.competencias_comissao(ano);
