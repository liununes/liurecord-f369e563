-- Allow anonymous (unauthenticated) users to update the "clients" row in site_content.
-- This is needed because clients access the gallery via a simple password (not Supabase auth)
-- and need to save their photo selections (liked/disliked) back to the database.
-- The data is already encrypted, so this is safe.

CREATE POLICY "Anon can update clients section"
  ON public.site_content
  FOR UPDATE
  USING (section_key = 'clients')
  WITH CHECK (section_key = 'clients');
