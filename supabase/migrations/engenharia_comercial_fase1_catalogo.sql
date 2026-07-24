-- ============================================================
-- Folk Reuniões — Engenharia Comercial: Fase 1 — Catálogo Base
-- Tabelas: ec_categorias_produto, ec_fabricantes,
--          ec_catalogo_itens, ec_fornecedores, ec_produto_fornecedor
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 1. Categorias de Produto
-- Taxonomia genérica: CFTV, Controle de Acesso, Interfonia...
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ec_categorias_produto (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT        NOT NULL UNIQUE,
  descricao   TEXT        NOT NULL DEFAULT '',
  icone       TEXT        NOT NULL DEFAULT '',
  ordem       INT         NOT NULL DEFAULT 0,
  ativo       BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ec_categorias_produto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_categorias_le_autenticados" ON public.ec_categorias_produto;
CREATE POLICY "ec_categorias_le_autenticados" ON public.ec_categorias_produto
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ec_categorias_admin_gerencia" ON public.ec_categorias_produto;
CREATE POLICY "ec_categorias_admin_gerencia" ON public.ec_categorias_produto
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seed: categorias iniciais
INSERT INTO public.ec_categorias_produto (nome, descricao, icone, ordem) VALUES
  ('Portaria Remota',      'Sistemas de portaria virtual e atendimento remoto',         'shield',       1),
  ('CFTV',                 'Câmeras, gravadores, armazenamento e acessórios de vídeo',  'camera',       2),
  ('Controle de Acesso',   'Leitores, catracas, fechaduras e controladores de acesso',  'key',          3),
  ('Interfonia',           'Ramais, centrais de interfonia e videoporteiros',            'phone',        4),
  ('Alarme',               'Sensores, centrais de alarme e periféricos',                'bell',         5),
  ('Rede',                 'Switches, roteadores, cabos e infraestrutura de rede',      'network',      6),
  ('Energia',              'Nobreaks, fontes, baterias e proteção elétrica',            'zap',          7),
  ('Monitoramento',        'Plataformas cloud, licenças e serviços de monitoramento',   'monitor',      8),
  ('Serviços',             'Instalação, configuração, manutenção e treinamento',        'tool',         9),
  ('Outros',               'Itens que não se enquadram nas categorias anteriores',      'package',     10)
ON CONFLICT (nome) DO NOTHING;

-- ============================================================
-- 2. Fabricantes
-- Quem fabrica o produto — separado de quem vende
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ec_fabricantes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         TEXT        NOT NULL,
  pais_origem  TEXT        NOT NULL DEFAULT '',
  website      TEXT        NOT NULL DEFAULT '',
  observacoes  TEXT        NOT NULL DEFAULT '',
  ativo        BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ec_fabricantes_nome_ativo_idx
  ON public.ec_fabricantes (nome) WHERE ativo = true;

ALTER TABLE public.ec_fabricantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_fabricantes_le_autenticados" ON public.ec_fabricantes;
CREATE POLICY "ec_fabricantes_le_autenticados" ON public.ec_fabricantes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ec_fabricantes_admin_gerencia" ON public.ec_fabricantes;
CREATE POLICY "ec_fabricantes_admin_gerencia" ON public.ec_fabricantes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Trigger: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION public.ec_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ec_fabricantes_updated_at ON public.ec_fabricantes;
CREATE TRIGGER ec_fabricantes_updated_at
  BEFORE UPDATE ON public.ec_fabricantes
  FOR EACH ROW EXECUTE FUNCTION public.ec_set_updated_at();

-- Seed: fabricantes comuns no mercado brasileiro de segurança
INSERT INTO public.ec_fabricantes (nome, pais_origem, website) VALUES
  ('Intelbras',   'Brasil',       'https://www.intelbras.com.br'),
  ('Hikvision',   'China',        'https://www.hikvision.com'),
  ('Dahua',       'China',        'https://www.dahuasecurity.com'),
  ('Axis',        'Suécia',       'https://www.axis.com'),
  ('Bosch',       'Alemanha',     'https://www.boschsecurity.com'),
  ('Control ID',  'Brasil',       'https://www.controlid.com.br'),
  ('Henry',       'Brasil',       'https://www.henry.com.br'),
  ('Comelit',     'Itália',       'https://www.comelit.com.br'),
  ('AGL',         'Brasil',       'https://www.agl.com.br'),
  ('TP-Link',     'China',        'https://www.tp-link.com/br'),
  ('Cisco',       'EUA',          'https://www.cisco.com'),
  ('Novamaster',  'Brasil',       'https://www.novamaster.com.br'),
  ('NHS',         'Brasil',       'https://www.nhs.com.br'),
  ('Outros',      '',             '')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. Catálogo de Itens (unificado)
-- Suporta: produto | serviço | licença | assinatura
-- Sem preço — preço fica em ec_produto_fornecedor
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ec_catalogo_itens (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo              TEXT        NOT NULL
                    CHECK (tipo IN ('produto', 'servico', 'licenca', 'assinatura')),
  categoria_id      UUID        NOT NULL REFERENCES public.ec_categorias_produto(id)
                    ON DELETE RESTRICT,
  fabricante_id     UUID        REFERENCES public.ec_fabricantes(id)
                    ON DELETE SET NULL,
  codigo            TEXT        NOT NULL DEFAULT '',
  nome              TEXT        NOT NULL,
  descricao         TEXT        NOT NULL DEFAULT '',
  unidade           TEXT        NOT NULL DEFAULT 'un'
                    CHECK (unidade IN ('un','h','dia','m','m²','m³','par','mês','ano','projeto','usuário','câmera','ponto','porta','vaga')),
  recorrente        BOOLEAN     NOT NULL DEFAULT false,
  dados_especificos JSONB       NOT NULL DEFAULT '{}',
  vigencia_inicio   DATE,
  vigencia_fim      DATE,
  ativo             BOOLEAN     NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ec_catalogo_vigencia_check
    CHECK (vigencia_fim IS NULL OR vigencia_fim > vigencia_inicio)
);

CREATE INDEX IF NOT EXISTS ec_catalogo_itens_tipo_idx       ON public.ec_catalogo_itens (tipo);
CREATE INDEX IF NOT EXISTS ec_catalogo_itens_categoria_idx  ON public.ec_catalogo_itens (categoria_id);
CREATE INDEX IF NOT EXISTS ec_catalogo_itens_fabricante_idx ON public.ec_catalogo_itens (fabricante_id);
CREATE INDEX IF NOT EXISTS ec_catalogo_itens_ativo_idx      ON public.ec_catalogo_itens (ativo);
CREATE INDEX IF NOT EXISTS ec_catalogo_itens_codigo_idx     ON public.ec_catalogo_itens (codigo) WHERE codigo <> '';

ALTER TABLE public.ec_catalogo_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_catalogo_le_autenticados" ON public.ec_catalogo_itens;
CREATE POLICY "ec_catalogo_le_autenticados" ON public.ec_catalogo_itens
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ec_catalogo_admin_gerencia" ON public.ec_catalogo_itens;
CREATE POLICY "ec_catalogo_admin_gerencia" ON public.ec_catalogo_itens
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP TRIGGER IF EXISTS ec_catalogo_itens_updated_at ON public.ec_catalogo_itens;
CREATE TRIGGER ec_catalogo_itens_updated_at
  BEFORE UPDATE ON public.ec_catalogo_itens
  FOR EACH ROW EXECUTE FUNCTION public.ec_set_updated_at();

-- ============================================================
-- 4. Fornecedores
-- Quem vende — independente de quem fabrica
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ec_fornecedores (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         TEXT        NOT NULL,
  cnpj         TEXT        NOT NULL DEFAULT '',
  contato      TEXT        NOT NULL DEFAULT '',
  email        TEXT        NOT NULL DEFAULT '',
  telefone     TEXT        NOT NULL DEFAULT '',
  observacoes  TEXT        NOT NULL DEFAULT '',
  ativo        BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ec_fornecedores_nome_ativo_idx
  ON public.ec_fornecedores (nome) WHERE ativo = true;

ALTER TABLE public.ec_fornecedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_fornecedores_le_autenticados" ON public.ec_fornecedores;
CREATE POLICY "ec_fornecedores_le_autenticados" ON public.ec_fornecedores
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ec_fornecedores_admin_gerencia" ON public.ec_fornecedores;
CREATE POLICY "ec_fornecedores_admin_gerencia" ON public.ec_fornecedores
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP TRIGGER IF EXISTS ec_fornecedores_updated_at ON public.ec_fornecedores;
CREATE TRIGGER ec_fornecedores_updated_at
  BEFORE UPDATE ON public.ec_fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.ec_set_updated_at();

-- ============================================================
-- 5. Produto × Fornecedor (precificação)
-- Mesmo item pode ser comprado de fornecedores distintos,
-- com preços, prazos e condições diferentes.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ec_produto_fornecedor (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id             UUID         NOT NULL REFERENCES public.ec_catalogo_itens(id)
                      ON DELETE CASCADE,
  fornecedor_id       UUID         NOT NULL REFERENCES public.ec_fornecedores(id)
                      ON DELETE CASCADE,
  codigo_fornecedor   TEXT         NOT NULL DEFAULT '',
  ultimo_preco        NUMERIC(12,2) NOT NULL DEFAULT 0
                      CHECK (ultimo_preco >= 0),
  data_ultimo_preco   DATE,
  prazo_entrega_dias  INT          NOT NULL DEFAULT 0
                      CHECK (prazo_entrega_dias >= 0),
  preferencial        BOOLEAN      NOT NULL DEFAULT false,
  observacoes         TEXT         NOT NULL DEFAULT '',
  ativo               BOOLEAN      NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

  UNIQUE (item_id, fornecedor_id)
);

CREATE INDEX IF NOT EXISTS ec_pf_item_idx        ON public.ec_produto_fornecedor (item_id);
CREATE INDEX IF NOT EXISTS ec_pf_fornecedor_idx  ON public.ec_produto_fornecedor (fornecedor_id);
CREATE INDEX IF NOT EXISTS ec_pf_preferencial_idx ON public.ec_produto_fornecedor (item_id, preferencial)
  WHERE preferencial = true;

ALTER TABLE public.ec_produto_fornecedor ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_pf_le_autenticados" ON public.ec_produto_fornecedor;
CREATE POLICY "ec_pf_le_autenticados" ON public.ec_produto_fornecedor
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ec_pf_admin_gerencia" ON public.ec_produto_fornecedor;
CREATE POLICY "ec_pf_admin_gerencia" ON public.ec_produto_fornecedor
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP TRIGGER IF EXISTS ec_pf_updated_at ON public.ec_produto_fornecedor;
CREATE TRIGGER ec_pf_updated_at
  BEFORE UPDATE ON public.ec_produto_fornecedor
  FOR EACH ROW EXECUTE FUNCTION public.ec_set_updated_at();

-- Garante no máximo um fornecedor preferencial por item
CREATE OR REPLACE FUNCTION public.ec_enforce_single_preferencial()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.preferencial = true THEN
    UPDATE public.ec_produto_fornecedor
    SET    preferencial = false
    WHERE  item_id      = NEW.item_id
      AND  id           <> NEW.id
      AND  preferencial = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ec_pf_single_preferencial ON public.ec_produto_fornecedor;
CREATE TRIGGER ec_pf_single_preferencial
  AFTER INSERT OR UPDATE OF preferencial ON public.ec_produto_fornecedor
  FOR EACH ROW
  WHEN (NEW.preferencial = true)
  EXECUTE FUNCTION public.ec_enforce_single_preferencial();

-- ============================================================
-- 6. Função auxiliar: retorna o preço vigente de um item
-- Prioridade: (1) fornecedor preferencial ativo,
--             (2) menor preço entre fornecedores ativos
-- ============================================================
CREATE OR REPLACE FUNCTION public.ec_preco_item(p_item_id UUID)
RETURNS TABLE (
  fornecedor_id   UUID,
  fornecedor_nome TEXT,
  preco           NUMERIC(12,2),
  prazo_dias      INT,
  preferencial    BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pf.fornecedor_id,
    f.nome,
    pf.ultimo_preco,
    pf.prazo_entrega_dias,
    pf.preferencial
  FROM public.ec_produto_fornecedor pf
  JOIN public.ec_fornecedores f ON f.id = pf.fornecedor_id
  WHERE pf.item_id = p_item_id
    AND pf.ativo   = true
    AND f.ativo    = true
  ORDER BY pf.preferencial DESC, pf.ultimo_preco ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
