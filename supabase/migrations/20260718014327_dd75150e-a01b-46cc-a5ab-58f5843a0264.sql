
-- Restore missing GRANTs on public tables (dropped during earlier security refactor).

-- user_roles: authenticated reads own row via RLS; admins manage via has_role.
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- site_content: anon can read non-client sections (RLS enforces); authenticated same + admin writes.
GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;

-- site_theme: publicly readable, admin writes.
GRANT SELECT ON public.site_theme TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_theme TO authenticated;
GRANT ALL ON public.site_theme TO service_role;

-- portfolio_media: publicly readable, admin writes.
GRANT SELECT ON public.portfolio_media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.portfolio_media TO authenticated;
GRANT ALL ON public.portfolio_media TO service_role;

-- client_sessions: only service_role (edge function) touches this.
GRANT ALL ON public.client_sessions TO service_role;
