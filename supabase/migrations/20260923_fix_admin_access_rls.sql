-- FIX Acesso Admin / RLS
-- Fecha políticas permissivas deixadas pelas migrations anteriores e mantém
-- escrita restrita a admins / service_role.
--
-- Remove:
--   - "Allow all user_roles"   (qualquer um podia se auto-promover a admin)
--   - "Allow all site_theme"   (anônimos podiam alterar cores/tema)
--   - "Allow all portfolio_media" (anônimos podiam inserir/excluir mídia)
--   - "Allow all on clients" / "Allow all on client_photos"
--   - storage.objects "Anyone can upload/update/delete media"

-- 1) user_roles: usuário autenticado apenas lê a própria role.
DROP POLICY IF EXISTS "Allow all user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON public.user_roles FROM anon, public;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 2) site_theme: leitura pública, escrita restrita a admin (RLS existente).
DROP POLICY IF EXISTS "Allow all site_theme" ON public.site_theme;

CREATE POLICY "Public read site_theme"
  ON public.site_theme FOR SELECT TO anon, authenticated
  USING (true);

REVOKE ALL ON public.site_theme FROM anon, public;
GRANT SELECT ON public.site_theme TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_theme TO authenticated;
GRANT ALL ON public.site_theme TO service_role;

-- 3) portfolio_media: leitura pública, escrita restrita a admin (RLS existente).
DROP POLICY IF EXISTS "Allow all portfolio_media" ON public.portfolio_media;

CREATE POLICY "Public read portfolio_media"
  ON public.portfolio_media FOR SELECT TO anon, authenticated
  USING (true);

REVOKE ALL ON public.portfolio_media FROM anon, public;
GRANT SELECT ON public.portfolio_media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.portfolio_media TO authenticated;
GRANT ALL ON public.portfolio_media TO service_role;

-- 4) clients / client_photos: somente service_role (edge functions).
DROP POLICY IF EXISTS "Allow all on clients" ON public.clients;
DROP POLICY IF EXISTS "Allow all on client_photos" ON public.client_photos;

REVOKE ALL ON public.clients FROM anon, authenticated;
REVOKE ALL ON public.client_photos FROM anon, authenticated;
GRANT ALL ON public.clients TO service_role;
GRANT ALL ON public.client_photos TO service_role;

-- 5) storage: fechar escrita/exclusão anônima no bucket público "media".
DROP POLICY IF EXISTS "Anyone can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete media" ON storage.objects;