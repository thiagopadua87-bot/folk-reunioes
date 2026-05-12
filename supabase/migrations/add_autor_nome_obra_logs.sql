-- Adiciona autor_nome à tabela obra_logs (igual ao padrão de crise_logs)
ALTER TABLE public.obra_logs ADD COLUMN IF NOT EXISTS autor_nome TEXT;
