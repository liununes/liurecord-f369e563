-- MIGRAÇÃO DEFINITIVA: RLS para site_content
-- Resolve conflito entre política admin (FOR ALL) e políticas públicas
--
-- PROBLEMA: A política "Admins can update site_content" (FOR ALL) conflita
-- com políticas públicas. Quando um usuário anônimo tentaUPDATE, ambas as
-- políticas são avaliadas. A política admin usa auth.uid() que retorna NULL
-- para anônimos, causando comportamento inesperado no Supabase.
--
-- SOLUÇÃO: Remover TODAS as políticas de UPDATE/INSERT/DELETE antigas e
-- recriar de forma limpa, sem conflitos.

-- 1. Remover TODAS as políticas antigas de INSERT/UPDATE/DELETE da tabela site_content
DROP POLICY IF EXISTS "Admins can insert site_content" ON public.site_content;
DROP POLICY IF EXISTS "Admins can update site_content" ON public.site_content;
DROP POLICY IF EXISTS "Admins can delete site_content" ON public.site_content;
DROP POLICY IF EXISTS "Allow public update clients" ON public.site_content;
DROP POLICY IF EXISTS "Allow public insert clients" ON public.site_content;
DROP POLICY IF EXISTS "Public can update clients selections" ON public.site_content;
DROP POLICY IF EXISTS "Public can insert clients data" ON public.site_content;
DROP POLICY IF EXISTS "Anon can update clients section" ON public.site_content;
DROP POLICY IF EXISTS "Allow public update clients" ON public.site_content;
DROP POLICY IF EXISTS "Allow public insert clients" ON public.site_content;
DROP POLICY IF EXISTS "site_content_admin_all" ON public.site_content;
DROP POLICY IF EXISTS "public_update_clients_section" ON public.site_content;
DROP POLICY IF EXISTS "public_insert_clients_section" ON public.site_content;
DROP POLICY IF EXISTS "anon_update_clients_only" ON public.site_content;
DROP POLICY IF EXISTS "anon_insert_clients_only" ON public.site_content;

-- 2. Garantir permissões de acesso
GRANT SELECT, UPDATE, INSERT ON public.site_content TO anon;
GRANT SELECT, UPDATE, INSERT ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;

-- 3. Política de SELECT: leitura pública (já existe, recriar se necessário)
DROP POLICY IF EXISTS "Public read site_content" ON public.site_content;
CREATE POLICY "Public read site_content" ON public.site_content
  FOR SELECT USING (true);

-- 4. Política de UPDATE: qualquer pessoa pode atualizar a seção "clients"
--    SEM cláusula TO = aplica a ANON e AUTHENTICATED igualmente
CREATE POLICY "allow_clients_update" ON public.site_content
  FOR UPDATE
  USING (section_key = 'clients')
  WITH CHECK (section_key = 'clients');

-- 5. Política de INSERT: qualquer pessoa pode inserir seção "clients"
CREATE POLICY "allow_clients_insert" ON public.site_content
  FOR INSERT
  WITH CHECK (section_key = 'clients');
