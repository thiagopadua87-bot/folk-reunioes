-- ============================================================
-- Folk Reuniões — Engenharia Comercial: Fase 2 — Motor de Engenharia
-- Tabelas: ec_kits, ec_kit_itens, ec_regras_composicao,
--          ec_solucoes, ec_solucao_kits
-- Depende da Fase 1 (ec_catalogo_itens, ec_categorias_produto)
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 1. Kits
-- Pacote de equipamentos/serviços que compõem uma solução.
-- Cada kit tem vigência para preservar histórico de propostas.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ec_kits (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             TEXT        NOT NULL,
  descricao        TEXT        NOT NULL DEFAULT '',
  categoria        TEXT        NOT NULL,
  vigencia_inicio  DATE        NOT NULL DEFAULT CURRENT_DATE,
  vigencia_fim     DATE,
  ativo            BOOLEAN     NOT NULL DEFAULT true,
  observacoes      TEXT        NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ec_kits_vigencia_check
    CHECK (vigencia_fim IS NULL OR vigencia_fim > vigencia_inicio)
);

CREATE INDEX IF NOT EXISTS ec_kits_categoria_idx ON public.ec_kits (categoria);
CREATE INDEX IF NOT EXISTS ec_kits_ativo_idx     ON public.ec_kits (ativo);

ALTER TABLE public.ec_kits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_kits_le_autenticados" ON public.ec_kits;
CREATE POLICY "ec_kits_le_autenticados" ON public.ec_kits
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ec_kits_admin_gerencia" ON public.ec_kits;
CREATE POLICY "ec_kits_admin_gerencia" ON public.ec_kits
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP TRIGGER IF EXISTS ec_kits_updated_at ON public.ec_kits;
CREATE TRIGGER ec_kits_updated_at
  BEFORE UPDATE ON public.ec_kits
  FOR EACH ROW EXECUTE FUNCTION public.ec_set_updated_at();

-- ============================================================
-- 2. Itens do Kit
-- Produtos/serviços que compõem cada kit, com quantidade base
-- e fator de multiplicação (ex: "por câmera", "fixo").
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ec_kit_itens (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id                UUID        NOT NULL REFERENCES public.ec_kits(id)
                        ON DELETE CASCADE,
  item_id               UUID        NOT NULL REFERENCES public.ec_catalogo_itens(id)
                        ON DELETE RESTRICT,
  quantidade_base       NUMERIC(10,3) NOT NULL DEFAULT 1
                        CHECK (quantidade_base > 0),
  fator_multiplicacao   TEXT        NOT NULL DEFAULT 'fixo'
                        CHECK (fator_multiplicacao IN (
                          'fixo',
                          'por_camera',
                          'por_acesso',
                          'por_portaria',
                          'por_unidade',
                          'por_ponto',
                          'por_porta',
                          'por_usuario'
                        )),
  observacoes           TEXT        NOT NULL DEFAULT '',
  ordem                 INT         NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (kit_id, item_id)
);

CREATE INDEX IF NOT EXISTS ec_kit_itens_kit_idx  ON public.ec_kit_itens (kit_id);
CREATE INDEX IF NOT EXISTS ec_kit_itens_item_idx ON public.ec_kit_itens (item_id);

ALTER TABLE public.ec_kit_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_kit_itens_le_autenticados" ON public.ec_kit_itens;
CREATE POLICY "ec_kit_itens_le_autenticados" ON public.ec_kit_itens
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ec_kit_itens_admin_gerencia" ON public.ec_kit_itens;
CREATE POLICY "ec_kit_itens_admin_gerencia" ON public.ec_kit_itens
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- 3. Regras de Composição
-- Lógica condicional do motor de engenharia.
-- SE [campo] [operador] [valor] ENTÃO [ação] [produto] [qtd]
-- kit_id NULL = regra global (aplica-se a qualquer kit)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ec_regras_composicao (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id                UUID        REFERENCES public.ec_kits(id)
                        ON DELETE CASCADE,
  nome                  TEXT        NOT NULL,
  descricao             TEXT        NOT NULL DEFAULT '',

  -- Condição
  condicao_campo        TEXT        NOT NULL,
  -- Exemplos: quantidade_cameras, quantidade_acessos,
  --           potencia_total_w, hd_necessario_tb,
  --           largura_banda_mb, quantidade_usuarios,
  --           quantidade_portarias, quantidade_pontos
  condicao_operador     TEXT        NOT NULL
                        CHECK (condicao_operador IN ('>', '<', '>=', '<=', '=', '!=')),
  condicao_valor        NUMERIC     NOT NULL,

  -- Ação
  acao                  TEXT        NOT NULL
                        CHECK (acao IN (
                          'adicionar_produto',
                          'substituir_produto',
                          'adicionar_quantidade',
                          'remover_produto'
                        )),
  produto_id            UUID        REFERENCES public.ec_catalogo_itens(id)
                        ON DELETE RESTRICT,
  produto_substituido_id UUID       REFERENCES public.ec_catalogo_itens(id)
                        ON DELETE RESTRICT,
  quantidade            NUMERIC(10,3) NOT NULL DEFAULT 1
                        CHECK (quantidade > 0),

  prioridade            INT         NOT NULL DEFAULT 10,
  ativo                 BOOLEAN     NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ec_regras_produto_required
    CHECK (acao IN ('remover_produto') OR produto_id IS NOT NULL),
  CONSTRAINT ec_regras_substituicao_required
    CHECK (acao <> 'substituir_produto' OR produto_substituido_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS ec_regras_kit_idx       ON public.ec_regras_composicao (kit_id);
CREATE INDEX IF NOT EXISTS ec_regras_campo_idx     ON public.ec_regras_composicao (condicao_campo);
CREATE INDEX IF NOT EXISTS ec_regras_prioridade_idx ON public.ec_regras_composicao (prioridade);
CREATE INDEX IF NOT EXISTS ec_regras_ativo_idx     ON public.ec_regras_composicao (ativo);

ALTER TABLE public.ec_regras_composicao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_regras_le_autenticados" ON public.ec_regras_composicao;
CREATE POLICY "ec_regras_le_autenticados" ON public.ec_regras_composicao
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ec_regras_admin_gerencia" ON public.ec_regras_composicao;
CREATE POLICY "ec_regras_admin_gerencia" ON public.ec_regras_composicao
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP TRIGGER IF EXISTS ec_regras_updated_at ON public.ec_regras_composicao;
CREATE TRIGGER ec_regras_updated_at
  BEFORE UPDATE ON public.ec_regras_composicao
  FOR EACH ROW EXECUTE FUNCTION public.ec_set_updated_at();

-- ============================================================
-- 4. Soluções
-- Abordagem técnica nomeada para uma categoria de necessidade.
-- Permite que a mesma necessidade seja atendida por diferentes
-- fabricantes ou tecnologias antes da composição automática.
-- Exemplo: "CFTV IP Intelbras Budget" vs "CFTV IP Axis Premium"
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ec_solucoes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT        NOT NULL,
  descricao   TEXT        NOT NULL DEFAULT '',
  categoria   TEXT        NOT NULL,
  tecnologia  TEXT        NOT NULL DEFAULT '',
  segmento    TEXT        NOT NULL DEFAULT 'intermediario'
              CHECK (segmento IN ('basico', 'intermediario', 'premium', 'ultra')),
  ativo       BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ec_solucoes_categoria_idx ON public.ec_solucoes (categoria);
CREATE INDEX IF NOT EXISTS ec_solucoes_ativo_idx     ON public.ec_solucoes (ativo);

ALTER TABLE public.ec_solucoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_solucoes_le_autenticados" ON public.ec_solucoes;
CREATE POLICY "ec_solucoes_le_autenticados" ON public.ec_solucoes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ec_solucoes_admin_gerencia" ON public.ec_solucoes;
CREATE POLICY "ec_solucoes_admin_gerencia" ON public.ec_solucoes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP TRIGGER IF EXISTS ec_solucoes_updated_at ON public.ec_solucoes;
CREATE TRIGGER ec_solucoes_updated_at
  BEFORE UPDATE ON public.ec_solucoes
  FOR EACH ROW EXECUTE FUNCTION public.ec_set_updated_at();

-- ============================================================
-- 5. Kits que compõem cada Solução
-- Uma solução pode agrupar múltiplos kits ordenados.
-- Exemplo: "Portaria Remota Premium" =
--   Kit Câmera Entrada (ordem 1)
--   Kit Totem IP       (ordem 2)
--   Kit Rede PoE       (ordem 3)
--   Kit Software PR    (ordem 4)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ec_solucao_kits (
  id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  solucao_id   UUID  NOT NULL REFERENCES public.ec_solucoes(id) ON DELETE CASCADE,
  kit_id       UUID  NOT NULL REFERENCES public.ec_kits(id)     ON DELETE RESTRICT,
  ordem        INT   NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (solucao_id, kit_id)
);

CREATE INDEX IF NOT EXISTS ec_sk_solucao_idx ON public.ec_solucao_kits (solucao_id);
CREATE INDEX IF NOT EXISTS ec_sk_kit_idx     ON public.ec_solucao_kits (kit_id);

ALTER TABLE public.ec_solucao_kits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_sk_le_autenticados" ON public.ec_solucao_kits;
CREATE POLICY "ec_sk_le_autenticados" ON public.ec_solucao_kits
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ec_sk_admin_gerencia" ON public.ec_solucao_kits;
CREATE POLICY "ec_sk_admin_gerencia" ON public.ec_solucao_kits
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- 6. View auxiliar: solução expandida
-- Retorna todos os itens de uma solução já expandidos,
-- com nome do kit, do item e fator de multiplicação.
-- Útil para preview de solução antes de montar a proposta.
-- ============================================================
CREATE OR REPLACE VIEW public.ec_solucao_itens_view AS
SELECT
  s.id          AS solucao_id,
  s.nome        AS solucao_nome,
  s.categoria,
  s.tecnologia,
  s.segmento,
  sk.ordem      AS kit_ordem,
  k.id          AS kit_id,
  k.nome        AS kit_nome,
  ki.ordem      AS item_ordem,
  ci.id         AS item_id,
  ci.tipo       AS item_tipo,
  ci.codigo     AS item_codigo,
  ci.nome       AS item_nome,
  ci.unidade,
  ci.recorrente,
  ki.quantidade_base,
  ki.fator_multiplicacao
FROM public.ec_solucoes        s
JOIN public.ec_solucao_kits    sk ON sk.solucao_id = s.id
JOIN public.ec_kits            k  ON k.id  = sk.kit_id
JOIN public.ec_kit_itens       ki ON ki.kit_id = k.id
JOIN public.ec_catalogo_itens  ci ON ci.id = ki.item_id
WHERE s.ativo = true
  AND k.ativo = true
  AND ci.ativo = true
  AND (k.vigencia_fim  IS NULL OR k.vigencia_fim  >= CURRENT_DATE)
  AND (ci.vigencia_fim IS NULL OR ci.vigencia_fim >= CURRENT_DATE)
ORDER BY s.nome, sk.ordem, ki.ordem;
