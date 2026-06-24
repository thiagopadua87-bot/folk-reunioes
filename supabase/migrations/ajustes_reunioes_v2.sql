-- ── Ajustes Reuniões v2 — Rastreabilidade, Prioridade, Auditoria ──────────────

-- 1. Novas colunas em reuniao_acoes
ALTER TABLE public.reuniao_acoes
  ADD COLUMN IF NOT EXISTS origem_acao_id UUID REFERENCES public.reuniao_acoes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prioridade     VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS created_by     UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS data_conclusao TIMESTAMPTZ;

-- Constraint de prioridade
ALTER TABLE public.reuniao_acoes
  DROP CONSTRAINT IF EXISTS reuniao_acoes_prioridade_check;
ALTER TABLE public.reuniao_acoes
  ADD  CONSTRAINT reuniao_acoes_prioridade_check
  CHECK (prioridade IN ('BAIXA', 'NORMAL', 'ALTA', 'CRITICA'));

-- 2. Renomear status PENDENTE → NAO_INICIADO
UPDATE public.reuniao_acoes SET status = 'NAO_INICIADO' WHERE status = 'PENDENTE';

ALTER TABLE public.reuniao_acoes
  DROP CONSTRAINT IF EXISTS reuniao_acoes_status_check;
ALTER TABLE public.reuniao_acoes
  ADD  CONSTRAINT reuniao_acoes_status_check
  CHECK (status IN ('NAO_INICIADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'));

-- 3. Assinatura da finalização em reunioes
ALTER TABLE public.reunioes
  ADD COLUMN IF NOT EXISTS finalizada_por UUID REFERENCES auth.users(id);

-- 4. Trigger: preencher created_by automaticamente
CREATE OR REPLACE FUNCTION public.set_reuniao_acao_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_reuniao_acao_created_by ON public.reuniao_acoes;
CREATE TRIGGER trg_reuniao_acao_created_by
  BEFORE INSERT ON public.reuniao_acoes
  FOR EACH ROW EXECUTE FUNCTION public.set_reuniao_acao_created_by();

-- 5. Trigger: data_conclusao automática
CREATE OR REPLACE FUNCTION public.set_reuniao_acao_data_conclusao()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'CONCLUIDO' THEN
      NEW.data_conclusao := NOW();
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'CONCLUIDO' AND (OLD.status IS NULL OR OLD.status <> 'CONCLUIDO') THEN
      NEW.data_conclusao := NOW();
    ELSIF NEW.status <> 'CONCLUIDO' AND OLD.status = 'CONCLUIDO' THEN
      NEW.data_conclusao := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reuniao_acao_conclusao ON public.reuniao_acoes;
CREATE TRIGGER trg_reuniao_acao_conclusao
  BEFORE INSERT OR UPDATE ON public.reuniao_acoes
  FOR EACH ROW EXECUTE FUNCTION public.set_reuniao_acao_data_conclusao();

-- 6. Índice para futura filtragem por responsável (created_by)
CREATE INDEX IF NOT EXISTS idx_reuniao_acoes_created_by
  ON public.reuniao_acoes(created_by);

CREATE INDEX IF NOT EXISTS idx_reuniao_acoes_origem
  ON public.reuniao_acoes(origem_acao_id)
  WHERE origem_acao_id IS NOT NULL;
