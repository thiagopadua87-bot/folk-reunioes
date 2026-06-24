-- ── Tipos de Ação de Cobrança (parametrizable) ──────────────────
CREATE TABLE IF NOT EXISTS tipos_acao_cobranca (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL,
  ativo      boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tipos_acao_cobranca ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "autenticados_le_tipos_acao" ON tipos_acao_cobranca;
CREATE POLICY "autenticados_le_tipos_acao" ON tipos_acao_cobranca
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_gerencia_tipos_acao" ON tipos_acao_cobranca;
CREATE POLICY "admin_gerencia_tipos_acao" ON tipos_acao_cobranca
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seed: 12 tipos iniciais
INSERT INTO tipos_acao_cobranca (nome) VALUES
  ('Ligação realizada'),
  ('WhatsApp enviado'),
  ('E-mail enviado'),
  ('Carta enviada'),
  ('Visita realizada'),
  ('Promessa de pagamento registrada'),
  ('Acordo / negociação realizada'),
  ('Encaminhado ao jurídico'),
  ('Protesto registrado'),
  ('Pagamento recebido'),
  ('Contato com síndico / gestor'),
  ('Outro')
ON CONFLICT DO NOTHING;

-- ── Faturas ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faturas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numero_nota     text NOT NULL UNIQUE,
  cliente         text NOT NULL,
  data_vencimento date NOT NULL,
  mes_referencia  text NOT NULL,
  valor           numeric(12,2) NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente','em_cobranca','promessa_pagamento','negociada','juridico','protestada','recebida','cancelada')),
  observacoes     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE faturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "autenticados_le_faturas" ON faturas;
CREATE POLICY "autenticados_le_faturas" ON faturas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "autenticados_insere_faturas" ON faturas;
CREATE POLICY "autenticados_insere_faturas" ON faturas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "autenticados_atualiza_faturas" ON faturas;
CREATE POLICY "autenticados_atualiza_faturas" ON faturas
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_exclui_faturas" ON faturas;
CREATE POLICY "admin_exclui_faturas" ON faturas
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── Ações de Inadimplência ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS inadimplencia_acoes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id         uuid NOT NULL REFERENCES faturas(id) ON DELETE CASCADE,
  usuario_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_acao         text NOT NULL,
  descricao         text,
  proxima_acao      text,
  data_proxima_acao date,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inadimplencia_acoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "autenticados_le_acoes_inadimplencia" ON inadimplencia_acoes;
CREATE POLICY "autenticados_le_acoes_inadimplencia" ON inadimplencia_acoes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "autenticados_insere_acoes_inadimplencia" ON inadimplencia_acoes;
CREATE POLICY "autenticados_insere_acoes_inadimplencia" ON inadimplencia_acoes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "autenticados_exclui_acoes_inadimplencia" ON inadimplencia_acoes;
CREATE POLICY "autenticados_exclui_acoes_inadimplencia" ON inadimplencia_acoes
  FOR DELETE TO authenticated
  USING (
    auth.uid() = usuario_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── Responsáveis por Cobrança ────────────────────────────────────
CREATE TABLE IF NOT EXISTS inadimplencia_responsaveis (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente     text NOT NULL UNIQUE,
  usuario_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inadimplencia_responsaveis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "autenticados_le_responsaveis_inadimplencia" ON inadimplencia_responsaveis;
CREATE POLICY "autenticados_le_responsaveis_inadimplencia" ON inadimplencia_responsaveis
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "autenticados_gerencia_responsaveis_inadimplencia" ON inadimplencia_responsaveis;
CREATE POLICY "autenticados_gerencia_responsaveis_inadimplencia" ON inadimplencia_responsaveis
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
