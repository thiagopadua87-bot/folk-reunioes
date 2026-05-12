-- Folk Reuniões — Obra Ações
-- Execute no Supabase Dashboard → SQL Editor

CREATE TABLE public.obra_acoes (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id        UUID        NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  titulo         TEXT        NOT NULL,
  descricao      TEXT        NOT NULL DEFAULT '',
  responsavel    TEXT        NOT NULL DEFAULT '',
  prazo          DATE,
  status         TEXT        NOT NULL DEFAULT 'pendente'
                 CHECK (status IN ('pendente','em_andamento','concluido','aguardando_terceiro','bloqueado')),
  prioridade     TEXT        NOT NULL DEFAULT 'media'
                 CHECK (prioridade IN ('baixa','media','alta','critica')),
  observacao     TEXT        NOT NULL DEFAULT '',
  data_conclusao DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.obra_acoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso a obra_acoes" ON public.obra_acoes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.obras o
      WHERE o.id = obra_acoes.obra_id
        AND (o.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE INDEX obra_acoes_obra_id_idx ON public.obra_acoes (obra_id, created_at ASC);
