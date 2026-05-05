-- Ampliar intervalo de andamento de (0,20,40,60,80,100) para 0-10-...-100
ALTER TABLE public.obras DROP CONSTRAINT IF EXISTS obras_andamento_check;
ALTER TABLE public.obras ADD CONSTRAINT obras_andamento_check
  CHECK (andamento IN (0,10,20,30,40,50,60,70,80,90,100));
