-- Permite que admin exclua registros da lixeira após restauração
CREATE POLICY "admin_exclui_lixeira" ON public.pipeline_lixeira
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
