ALTER TABLE public.terceirizados ADD COLUMN IF NOT EXISTS cnpj TEXT NOT NULL DEFAULT '';
ALTER TABLE public.terceirizados ADD COLUMN IF NOT EXISTS nome_responsavel TEXT NOT NULL DEFAULT '';
ALTER TABLE public.terceirizados ADD COLUMN IF NOT EXISTS cpf_responsavel TEXT NOT NULL DEFAULT '';
ALTER TABLE public.terceirizados DROP COLUMN IF EXISTS tipo_servico;
