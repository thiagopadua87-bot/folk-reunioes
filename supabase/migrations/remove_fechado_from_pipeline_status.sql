-- Migra registros 'fechado' → 'fechado_ganho' e remove o status do constraint
UPDATE public.pipeline SET status = 'fechado_ganho' WHERE status = 'fechado';

ALTER TABLE public.pipeline DROP CONSTRAINT pipeline_status_check;
ALTER TABLE public.pipeline ADD CONSTRAINT pipeline_status_check
  CHECK (status IN ('apresentacao','em_analise','assinatura','declinado','fechado_ganho'));
