-- Permite que qualquer usuário autenticado acesse e edite todos os registros.
-- O painel admin continua protegido por verificação de role no app + service role key.

-- ── vendedores ────────────────────────────────────────────────
ALTER TABLE public.vendedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vendedores_policy"          ON public.vendedores;
DROP POLICY IF EXISTS "all_authenticated_vendedores" ON public.vendedores;
CREATE POLICY "all_authenticated_vendedores" ON public.vendedores
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── tecnicos ──────────────────────────────────────────────────
ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tecnicos_policy"          ON public.tecnicos;
DROP POLICY IF EXISTS "all_authenticated_tecnicos" ON public.tecnicos;
CREATE POLICY "all_authenticated_tecnicos" ON public.tecnicos
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── terceirizados ─────────────────────────────────────────────
ALTER TABLE public.terceirizados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "terceirizados_policy"          ON public.terceirizados;
DROP POLICY IF EXISTS "all_authenticated_terceirizados" ON public.terceirizados;
CREATE POLICY "all_authenticated_terceirizados" ON public.terceirizados
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── vendas ────────────────────────────────────────────────────
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vendas_policy"          ON public.vendas;
DROP POLICY IF EXISTS "all_authenticated_vendas" ON public.vendas;
CREATE POLICY "all_authenticated_vendas" ON public.vendas
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── venda_servicos ────────────────────────────────────────────
ALTER TABLE public.venda_servicos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "venda_servicos_policy"          ON public.venda_servicos;
DROP POLICY IF EXISTS "all_authenticated_venda_servicos" ON public.venda_servicos;
CREATE POLICY "all_authenticated_venda_servicos" ON public.venda_servicos
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── pipeline ──────────────────────────────────────────────────
ALTER TABLE public.pipeline ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pipeline_policy"          ON public.pipeline;
DROP POLICY IF EXISTS "all_authenticated_pipeline" ON public.pipeline;
CREATE POLICY "all_authenticated_pipeline" ON public.pipeline
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── pipeline_logs ─────────────────────────────────────────────
ALTER TABLE public.pipeline_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pipeline_logs_policy"          ON public.pipeline_logs;
DROP POLICY IF EXISTS "all_authenticated_pipeline_logs" ON public.pipeline_logs;
CREATE POLICY "all_authenticated_pipeline_logs" ON public.pipeline_logs
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── projetos ──────────────────────────────────────────────────
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projetos_policy"          ON public.projetos;
DROP POLICY IF EXISTS "all_authenticated_projetos" ON public.projetos;
CREATE POLICY "all_authenticated_projetos" ON public.projetos
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── projeto_logs ──────────────────────────────────────────────
ALTER TABLE public.projeto_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projeto_logs_policy"          ON public.projeto_logs;
DROP POLICY IF EXISTS "all_authenticated_projeto_logs" ON public.projeto_logs;
CREATE POLICY "all_authenticated_projeto_logs" ON public.projeto_logs
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── obras ─────────────────────────────────────────────────────
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "obras_policy"          ON public.obras;
DROP POLICY IF EXISTS "all_authenticated_obras" ON public.obras;
CREATE POLICY "all_authenticated_obras" ON public.obras
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── obra_logs ─────────────────────────────────────────────────
ALTER TABLE public.obra_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "obra_logs_policy"          ON public.obra_logs;
DROP POLICY IF EXISTS "all_authenticated_obra_logs" ON public.obra_logs;
CREATE POLICY "all_authenticated_obra_logs" ON public.obra_logs
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
