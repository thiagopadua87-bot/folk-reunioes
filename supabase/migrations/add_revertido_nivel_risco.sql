-- Mudança 3: adicionar 'revertido' ao CHECK constraint de risco em gestao_crise
-- risco é TEXT + CHECK constraint (não Postgres ENUM), então a migration é DROP + ADD.
DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  SELECT conname INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = 'public.gestao_crise'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%risco%';

  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.gestao_crise DROP CONSTRAINT ' || quote_ident(v_constraint);
  END IF;
END $$;

ALTER TABLE public.gestao_crise
  ADD CONSTRAINT gestao_crise_risco_check
  CHECK (risco IN ('baixo', 'medio', 'alto', 'revertido'));
