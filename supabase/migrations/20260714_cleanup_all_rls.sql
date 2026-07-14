-- LIMPEZA TOTAL: Remove TODAS as políticas permissivas duplicadas
-- e recria uma única política FOR ALL por tabela.
-- Execute este SQL no Supabase SQL Editor e verifique o resultado.

DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'site_content', 'fotos', 'locutores',
    'profiles', 'podcast_channels', 'podcast_episodes',
    'contacts', 'schedules'
  ])
  LOOP
    FOR pol IN
      SELECT schemaname, tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        pol.policyname, pol.tablename
      );
      RAISE NOTICE 'Dropped policy % on %', pol.policyname, pol.tablename;
    END LOOP;

    EXECUTE format(
      'CREATE POLICY "Allow all %I" ON public.%I FOR ALL USING (true) WITH CHECK (true)',
      t, t
    );
    RAISE NOTICE 'Created permissive FOR ALL policy on %', t;
  END LOOP;
END $$;

-- Garantir permissões GRANT
GRANT ALL ON public.site_content TO anon;
GRANT ALL ON public.site_content TO authenticated;
GRANT ALL ON public.fotos TO anon;
GRANT ALL ON public.fotos TO authenticated;
GRANT ALL ON public.locutores TO anon;
GRANT ALL ON public.locutores TO authenticated;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.podcast_channels TO anon;
GRANT ALL ON public.podcast_channels TO authenticated;
GRANT ALL ON public.podcast_episodes TO anon;
GRANT ALL ON public.podcast_episodes TO authenticated;
GRANT ALL ON public.contacts TO anon;
GRANT ALL ON public.contacts TO authenticated;
GRANT ALL ON public.schedules TO anon;
GRANT ALL ON public.schedules TO authenticated;
