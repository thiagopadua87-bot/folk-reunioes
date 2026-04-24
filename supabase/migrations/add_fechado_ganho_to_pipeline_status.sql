-- Adiciona 'fechado_ganho' ao check constraint de status do pipeline
-- Execute no Supabase Dashboard → SQL Editor

ALTER TABLE public.pipeline DROP CONSTRAINT pipeline_status_check;

ALTER TABLE public.pipeline ADD CONSTRAINT pipeline_status_check
  CHECK (status IN ('apresentacao','em_analise','assinatura','fechado','declinado','fechado_ganho'));
