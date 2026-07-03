-- CORREÇÃO DEFINITIVA: Permitir que QUALQUER role (anon, authenticated) atualize a seção "clients"
--
-- Causa do erro: O Supabase client usa persistSession=true. Se o admin já fez login
-- nesse navegador (mesmo no celular), o token fica salvo e as requisições vão com
-- role "authenticated" em vez de "anon". A política anterior só liberava "anon".
-- Resultado: UPDATE bloqueado silenciosamente.
--
-- Solução: Criar políticas SEM cláusula TO (aplica a todas as roles), restringindo
-- apenas pela condição section_key = 'clients'.

-- Limpar políticas anteriores de insert/update de clientes
DROP POLICY IF EXISTS "anon_update_clients_only" ON public.site_content;
DROP POLICY IF EXISTS "anon_insert_clients_only" ON public.site_content;
DROP POLICY IF EXISTS "Allow public update clients" ON public.site_content;
DROP POLICY IF EXISTS "Allow public insert clients" ON public.site_content;
DROP POLICY IF EXISTS "Anon can update clients section" ON public.site_content;

-- Política de UPDATE: qualquer role pode atualizar APENAS a seção "clients"
-- Sem cláusula TO = aplica a anon E authenticated
CREATE POLICY "public_update_clients_section" ON public.site_content
  FOR UPDATE
  USING (section_key = 'clients')
  WITH CHECK (section_key = 'clients');

-- Política de INSERT: qualquer role pode inserir se a seção for "clients"
CREATE POLICY "public_insert_clients_section" ON public.site_content
  FOR INSERT
  WITH CHECK (section_key = 'clients');
