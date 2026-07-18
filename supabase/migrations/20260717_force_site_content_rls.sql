-- Força permissões no site_content para o role anon (client gallery)
-- O erro RLS 42501 indica que o anon não tem permissão de UPDATE/UPSERT

-- Remove TODAS as policies existentes na tabela
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'site_content'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.site_content', pol.policyname);
  END LOOP;
END $$;

-- Cria policy permissiva para todos os roles
CREATE POLICY "Allow all on site_content"
  ON public.site_content
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Garante permissões no role anon
GRANT ALL ON public.site_content TO anon;
GRANT ALL ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
