
-- 1) Tighten site_content: split public read (non-client sections) vs admin-only for 'clients'
DROP POLICY IF EXISTS "Allow all on site_content" ON public.site_content;

CREATE POLICY "Public read non-client sections"
  ON public.site_content FOR SELECT
  TO anon, authenticated
  USING (section_key <> 'clients');

CREATE POLICY "Admins read all site_content"
  ON public.site_content FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins insert site_content"
  ON public.site_content FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update site_content"
  ON public.site_content FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete site_content"
  ON public.site_content FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Ensure anon still has SELECT grant (needed for public read of non-client sections)
GRANT SELECT ON public.site_content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;

-- 2) Revoke EXECUTE on has_role from anon/authenticated (still usable inside RLS/definer contexts)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

-- 3) Storage media bucket: drop broad public SELECT (public bucket still serves direct URLs)
DROP POLICY IF EXISTS "Public read media" ON storage.objects;

-- Allow authenticated admins to list/manage
CREATE POLICY "Admins read media objects"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4) client_sessions table for server-side gallery auth tokens
CREATE TABLE public.client_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  client_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_sessions_token ON public.client_sessions(token);
CREATE INDEX idx_client_sessions_expires ON public.client_sessions(expires_at);

GRANT ALL ON public.client_sessions TO service_role;

ALTER TABLE public.client_sessions ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: only service_role (edge functions) can access.
CREATE POLICY "Admins read client_sessions"
  ON public.client_sessions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
