-- Tabela de motivos de perda gerenciáveis
CREATE TABLE IF NOT EXISTS motivos_perda (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE motivos_perda ADD CONSTRAINT motivos_perda_nome_unique UNIQUE (nome);

ALTER TABLE motivos_perda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aprovados podem ler motivos_perda" ON motivos_perda
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'aprovado')
  );

CREATE POLICY "Aprovados podem inserir motivos_perda" ON motivos_perda
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'aprovado')
  );

CREATE POLICY "Aprovados podem editar motivos_perda" ON motivos_perda
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'aprovado')
  );

-- Seed: motivos existentes no sistema
INSERT INTO motivos_perda (nome, status) VALUES
  ('Qualidade do serviço', 'ativo'),
  ('Preço',                'ativo'),
  ('Relacionamento',       'ativo'),
  ('Faturamento',          'ativo'),
  ('Outros',               'ativo')
ON CONFLICT (nome) DO NOTHING;

-- Remover constraint de check para permitir migração de slugs para UUIDs
ALTER TABLE clientes_perdidos DROP CONSTRAINT IF EXISTS clientes_perdidos_motivo_perda_check;

-- Migrar registros antigos de clientes_perdidos (slugs → UUIDs)
DO $$
DECLARE
  v_qualidade     UUID;
  v_preco         UUID;
  v_relacionamento UUID;
  v_faturamento   UUID;
  v_outros        UUID;
BEGIN
  SELECT id INTO v_qualidade      FROM motivos_perda WHERE nome = 'Qualidade do serviço' LIMIT 1;
  SELECT id INTO v_preco          FROM motivos_perda WHERE nome = 'Preço'                 LIMIT 1;
  SELECT id INTO v_relacionamento FROM motivos_perda WHERE nome = 'Relacionamento'        LIMIT 1;
  SELECT id INTO v_faturamento    FROM motivos_perda WHERE nome = 'Faturamento'           LIMIT 1;
  SELECT id INTO v_outros         FROM motivos_perda WHERE nome = 'Outros'                LIMIT 1;

  UPDATE clientes_perdidos SET motivo_perda = v_qualidade::text      WHERE motivo_perda = 'qualidade_servico';
  UPDATE clientes_perdidos SET motivo_perda = v_preco::text          WHERE motivo_perda = 'preco';
  UPDATE clientes_perdidos SET motivo_perda = v_relacionamento::text WHERE motivo_perda = 'relacionamento';
  UPDATE clientes_perdidos SET motivo_perda = v_faturamento::text    WHERE motivo_perda = 'faturamento';
  UPDATE clientes_perdidos SET motivo_perda = v_outros::text         WHERE motivo_perda = 'outros';
END;
$$;
