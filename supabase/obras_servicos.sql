-- Substitui campo tipo por servicos (array) em obras
ALTER TABLE public.obras DROP COLUMN IF EXISTS tipo;
ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS servicos TEXT[] NOT NULL DEFAULT '{}';
