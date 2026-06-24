-- Índices para performance do módulo de cobrança
CREATE INDEX IF NOT EXISTS idx_inadimplencia_acoes_fatura_created
  ON inadimplencia_acoes(fatura_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_faturas_status
  ON faturas(status);

CREATE INDEX IF NOT EXISTS idx_faturas_vencimento
  ON faturas(data_vencimento);

CREATE INDEX IF NOT EXISTS idx_faturas_updated_at
  ON faturas(updated_at);
