-- Replace RLS policy checks that depended on executing private_utils.has_role from the API.
-- The private security-definer function remains non-executable by anon/authenticated users,
-- preserving the previous security hardening while allowing policies to evaluate normally.

-- public.site_content
DROP POLICY IF EXISTS "Admins read all site_content" ON public.site_content;
DROP POLICY IF EXISTS "Admins insert site_content" ON public.site_content;
DROP POLICY IF EXISTS "Admins update site_content" ON public.site_content;
DROP POLICY IF EXISTS "Admins delete site_content" ON public.site_content;

CREATE POLICY "Admins read all site_content"
ON public.site_content
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
);

CREATE POLICY "Admins insert site_content"
ON public.site_content
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
);

CREATE POLICY "Admins update site_content"
ON public.site_content
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
);

CREATE POLICY "Admins delete site_content"
ON public.site_content
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
);

-- public.site_theme
DROP POLICY IF EXISTS "Admins can insert site_theme" ON public.site_theme;
DROP POLICY IF EXISTS "Admins can update site_theme" ON public.site_theme;
DROP POLICY IF EXISTS "Admins can delete site_theme" ON public.site_theme;

CREATE POLICY "Admins can insert site_theme"
ON public.site_theme
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
);

CREATE POLICY "Admins can update site_theme"
ON public.site_theme
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
);

CREATE POLICY "Admins can delete site_theme"
ON public.site_theme
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
);

-- public.portfolio_media
DROP POLICY IF EXISTS "Admins can insert portfolio_media" ON public.portfolio_media;
DROP POLICY IF EXISTS "Admins can update portfolio_media" ON public.portfolio_media;
DROP POLICY IF EXISTS "Admins can delete portfolio_media" ON public.portfolio_media;

CREATE POLICY "Admins can insert portfolio_media"
ON public.portfolio_media
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
);

CREATE POLICY "Admins can update portfolio_media"
ON public.portfolio_media
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
);

CREATE POLICY "Admins can delete portfolio_media"
ON public.portfolio_media
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
);

-- public.client_sessions
DROP POLICY IF EXISTS "Admins read client_sessions" ON public.client_sessions;

CREATE POLICY "Admins read client_sessions"
ON public.client_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
);

-- public.user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
);

-- storage.objects policies for admin uploads/management
DROP POLICY IF EXISTS "Admins can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update media" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete media" ON storage.objects;
DROP POLICY IF EXISTS "Admins read media objects" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage client-photos select" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage client-photos insert" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage client-photos update" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage client-photos delete" ON storage.objects;

CREATE POLICY "Admins can upload media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
);

CREATE POLICY "Admins can update media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
)
WITH CHECK (
  bucket_id = 'media'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
);

CREATE POLICY "Admins can delete media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'media'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
);

CREATE POLICY "Admins read media objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'media'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
);

CREATE POLICY "Admins manage client-photos select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
);

CREATE POLICY "Admins manage client-photos insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-photos'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
);

CREATE POLICY "Admins manage client-photos update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
)
WITH CHECK (
  bucket_id = 'client-photos'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
);

CREATE POLICY "Admins manage client-photos delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-photos'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'::public.app_role
  )
);