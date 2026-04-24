-- Adiciona campo observacoes à tabela projetos
-- Execute no Supabase Dashboard → SQL Editor

ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS observacoes TEXT NOT NULL DEFAULT '';
