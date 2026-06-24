-- ── Índices para agregações do dashboard ────────────────────────
CREATE INDEX IF NOT EXISTS idx_faturas_mes_status_valor
  ON faturas(mes_referencia, status, valor);

CREATE INDEX IF NOT EXISTS idx_faturas_cliente_status_valor
  ON faturas(cliente, status, valor);

-- ── RPC: histórico mensal (12 meses) ────────────────────────────
CREATE OR REPLACE FUNCTION dashboard_historico_mensal()
RETURNS TABLE (
  mes          text,
  importado    numeric,
  recebido     numeric,
  em_aberto    numeric,
  qtd_total    bigint,
  qtd_recebida bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    mes_referencia                                            AS mes,
    SUM(valor)                                               AS importado,
    SUM(CASE WHEN status = 'recebida' THEN valor ELSE 0 END) AS recebido,
    SUM(CASE WHEN status NOT IN ('recebida','cancelada') THEN valor ELSE 0 END) AS em_aberto,
    COUNT(*)                                                 AS qtd_total,
    COUNT(*) FILTER (WHERE status = 'recebida')              AS qtd_recebida
  FROM faturas
  WHERE mes_referencia >= TO_CHAR(NOW() - INTERVAL '11 months', 'YYYY-MM')
  GROUP BY mes_referencia
  ORDER BY mes_referencia ASC;
$$;

-- ── RPC: histórico diário de um mês ─────────────────────────────
CREATE OR REPLACE FUNCTION dashboard_historico_diario(p_mes text)
RETURNS TABLE (
  dia       text,
  em_aberto numeric,
  recebido  numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH serie AS (
    SELECT generate_series(
      TO_DATE(p_mes || '-01', 'YYYY-MM-DD'),
      LEAST(
        (TO_DATE(p_mes || '-01', 'YYYY-MM-DD') + INTERVAL '1 month - 1 day')::date,
        CURRENT_DATE
      ),
      INTERVAL '1 day'
    )::date AS dia
  ),
  faturas_mes AS (
    SELECT id, valor, status, updated_at::date AS data_quitacao
    FROM faturas
    WHERE mes_referencia = p_mes
  )
  SELECT
    TO_CHAR(s.dia, 'YYYY-MM-DD') AS dia,
    SUM(CASE
      WHEN f.status != 'recebida' THEN f.valor
      WHEN f.data_quitacao > s.dia THEN f.valor
      ELSE 0
    END)                          AS em_aberto,
    SUM(CASE
      WHEN f.status = 'recebida' AND f.data_quitacao <= s.dia THEN f.valor
      ELSE 0
    END)                          AS recebido
  FROM serie s
  CROSS JOIN faturas_mes f
  GROUP BY s.dia
  ORDER BY s.dia ASC;
$$;

-- ── RPC: aging (faixas de atraso) ───────────────────────────────
CREATE OR REPLACE FUNCTION dashboard_aging()
RETURNS TABLE (
  faixa    text,
  ordem    int,
  qtd      bigint,
  valor    numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    CASE
      WHEN (CURRENT_DATE - data_vencimento) BETWEEN 1  AND 5   THEN 'Até 5 dias'
      WHEN (CURRENT_DATE - data_vencimento) BETWEEN 6  AND 15  THEN '6 a 15 dias'
      WHEN (CURRENT_DATE - data_vencimento) BETWEEN 16 AND 30  THEN '16 a 30 dias'
      WHEN (CURRENT_DATE - data_vencimento) BETWEEN 31 AND 60  THEN '31 a 60 dias'
      WHEN (CURRENT_DATE - data_vencimento) BETWEEN 61 AND 90  THEN '61 a 90 dias'
      WHEN (CURRENT_DATE - data_vencimento) BETWEEN 91 AND 180 THEN '91 a 180 dias'
      WHEN (CURRENT_DATE - data_vencimento) BETWEEN 181 AND 360 THEN '181 a 360 dias'
      ELSE 'Acima de 360 dias'
    END                              AS faixa,
    CASE
      WHEN (CURRENT_DATE - data_vencimento) BETWEEN 1  AND 5   THEN 1
      WHEN (CURRENT_DATE - data_vencimento) BETWEEN 6  AND 15  THEN 2
      WHEN (CURRENT_DATE - data_vencimento) BETWEEN 16 AND 30  THEN 3
      WHEN (CURRENT_DATE - data_vencimento) BETWEEN 31 AND 60  THEN 4
      WHEN (CURRENT_DATE - data_vencimento) BETWEEN 61 AND 90  THEN 5
      WHEN (CURRENT_DATE - data_vencimento) BETWEEN 91 AND 180 THEN 6
      WHEN (CURRENT_DATE - data_vencimento) BETWEEN 181 AND 360 THEN 7
      ELSE 8
    END                              AS ordem,
    COUNT(*)                         AS qtd,
    SUM(valor)                       AS valor
  FROM faturas
  WHERE status NOT IN ('recebida', 'cancelada')
    AND data_vencimento < CURRENT_DATE
  GROUP BY faixa, ordem
  ORDER BY ordem ASC;
$$;

-- ── RPC: top 10 devedores ────────────────────────────────────────
CREATE OR REPLACE FUNCTION dashboard_top10_devedores()
RETURNS TABLE (
  cliente text,
  qtd     bigint,
  valor   numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    cliente,
    COUNT(*) AS qtd,
    SUM(valor) AS valor
  FROM faturas
  WHERE status NOT IN ('recebida', 'cancelada')
  GROUP BY cliente
  ORDER BY valor DESC
  LIMIT 10;
$$;

-- Permissões para usuários autenticados
GRANT EXECUTE ON FUNCTION dashboard_historico_mensal()          TO authenticated;
GRANT EXECUTE ON FUNCTION dashboard_historico_diario(text)      TO authenticated;
GRANT EXECUTE ON FUNCTION dashboard_aging()                     TO authenticated;
GRANT EXECUTE ON FUNCTION dashboard_top10_devedores()           TO authenticated;
