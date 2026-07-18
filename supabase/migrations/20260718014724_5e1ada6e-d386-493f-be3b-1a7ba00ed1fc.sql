GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT ON public.site_content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;

GRANT SELECT ON public.site_theme TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_theme TO authenticated;
GRANT ALL ON public.site_theme TO service_role;

GRANT SELECT ON public.portfolio_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_media TO authenticated;
GRANT ALL ON public.portfolio_media TO service_role;

GRANT SELECT ON public.client_sessions TO authenticated;
GRANT ALL ON public.client_sessions TO service_role;