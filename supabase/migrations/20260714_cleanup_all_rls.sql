DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        pol.policyname, t
      );
    END LOOP;

    EXECUTE format(
      'CREATE POLICY "Allow all %I" ON public.%I FOR ALL USING (true) WITH CHECK (true)',
      t, t
    );
    RAISE NOTICE 'Created permissive FOR ALL policy on %', t;

    EXECUTE format('GRANT ALL ON public.%I TO anon', t);
    EXECUTE format('GRANT ALL ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;
