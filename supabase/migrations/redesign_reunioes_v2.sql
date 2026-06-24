-- ── Redesign Reuniões v2 ──────────────────────────────────────
-- Adds new columns to reunioes and creates related tables

-- Add new columns to reunioes
ALTER TABLE public.reunioes
  ADD COLUMN IF NOT EXISTS titulo TEXT NOT NULL DEFAULT 'Reunião',
  ADD COLUMN IF NOT EXISTS horario_inicio TIME,
  ADD COLUMN IF NOT EXISTS horario_fim TIME,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativa'
    CHECK (status IN ('ativa', 'finalizada')),
  ADD COLUMN IF NOT EXISTS observacoes_gerais TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS finalizada_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reaberta_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_reabertura TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reaberta_por UUID REFERENCES auth.users(id);

-- Participants table
CREATE TABLE IF NOT EXISTS public.reuniao_participantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reuniao_id UUID NOT NULL REFERENCES public.reunioes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  presente BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reuniao_participantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso a reuniao_participantes" ON public.reuniao_participantes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  );

-- Actions table
CREATE TABLE IF NOT EXISTS public.reuniao_acoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reuniao_id UUID NOT NULL REFERENCES public.reunioes(id) ON DELETE CASCADE,
  numero_seq INTEGER NOT NULL DEFAULT 1,
  what TEXT NOT NULL,
  how TEXT NOT NULL DEFAULT '',
  who TEXT NOT NULL,
  when_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO')),
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reuniao_acoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso a reuniao_acoes" ON public.reuniao_acoes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  );

-- Trigger: auto-set numero_seq on insert
CREATE OR REPLACE FUNCTION public.set_reuniao_acao_numero()
RETURNS TRIGGER AS $$
BEGIN
  NEW.numero_seq := COALESCE(
    (SELECT MAX(numero_seq) FROM public.reuniao_acoes WHERE reuniao_id = NEW.reuniao_id),
    0
  ) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_reuniao_acao_numero ON public.reuniao_acoes;
CREATE TRIGGER trg_reuniao_acao_numero
  BEFORE INSERT ON public.reuniao_acoes
  FOR EACH ROW EXECUTE FUNCTION public.set_reuniao_acao_numero();

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_reuniao_acao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reuniao_acao_updated ON public.reuniao_acoes;
CREATE TRIGGER trg_reuniao_acao_updated
  BEFORE UPDATE ON public.reuniao_acoes
  FOR EACH ROW EXECUTE FUNCTION public.touch_reuniao_acao();

-- Logs / audit table
CREATE TABLE IF NOT EXISTS public.reuniao_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reuniao_id UUID NOT NULL REFERENCES public.reunioes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  campo TEXT NOT NULL,
  valor_anterior TEXT NOT NULL DEFAULT '',
  valor_novo TEXT NOT NULL DEFAULT '',
  autor_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reuniao_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso a reuniao_logs" ON public.reuniao_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  );

-- Update RLS on reunioes table for team visibility
DROP POLICY IF EXISTS "Reunioes proprias" ON public.reunioes;
DROP POLICY IF EXISTS "Acesso a reunioes" ON public.reunioes;

CREATE POLICY "Acesso a reunioes" ON public.reunioes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  );
