-- Cria tabela de síndicos e gestores
CREATE TABLE public.sindicos_gestores (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       TEXT        NOT NULL,
  telefone   TEXT        NOT NULL DEFAULT '',
  email      TEXT        NOT NULL DEFAULT '',
  tipo       TEXT        NOT NULL CHECK (tipo IN ('Síndico Morador', 'Síndico Profissional', 'Gestor de Contrato')),
  ativo      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sindicos_gestores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a sindicos_gestores" ON public.sindicos_gestores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado')
  );

CREATE INDEX IF NOT EXISTS idx_sindicos_gestores_nome
  ON public.sindicos_gestores(nome);

-- Vincula síndico/gestor ao pipeline (FK com SET NULL para não quebrar leads existentes)
ALTER TABLE public.pipeline
  ADD COLUMN IF NOT EXISTS sindico_gestor_id UUID REFERENCES public.sindicos_gestores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pipeline_sindico_gestor_id
  ON public.pipeline(sindico_gestor_id);
