-- Substitui campo tipo por servicos (array) em projetos
ALTER TABLE public.projetos DROP COLUMN IF EXISTS tipo;
ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS servicos TEXT[] NOT NULL DEFAULT '{}';
