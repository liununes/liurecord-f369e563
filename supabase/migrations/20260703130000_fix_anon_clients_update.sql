-- FIX: Permitir que usuários anônimos atualizem APENAS a seção "clients" na tabela site_content.
--
-- Problema: As políticas anteriores conflitavam entre si. A política de admin usa
-- `public.has_role(auth.uid(), 'admin')` que retorna FALSE para anônimos (auth.uid() = NULL),
-- e o PostgREST aplica TODAS as políticas de UPDATE com OR. Porém, o Supabase pode
-- ter comportamento inesperado quando múltiplas políticas existem com TO clauses diferentes.
-- Solução: Limpar e recriar políticas de forma limpa.

-- 1. Remover TODAS as políticas antigas de UPDATE/INSERT/DELETE da tabela site_content
DROP POLICY IF EXISTS "Admins can insert site_content" ON public.site_content;
DROP POLICY IF EXISTS "Admins can update site_content" ON public.site_content;
DROP POLICY IF EXISTS "Admins can delete site_content" ON public.site_content;
DROP POLICY IF EXISTS "Allow public update clients" ON public.site_content;
DROP POLICY IF EXISTS "Allow public insert clients" ON public.site_content;
DROP POLICY IF EXISTS "Public can update clients selections" ON public.site_content;
DROP POLICY IF EXISTS "Public can insert clients data" ON public.site_content;
DROP POLICY IF EXISTS "Anon can update clients section" ON public.site_content;

-- 2. Garantir que a tabela tenha RLS ativado
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- 3. Garantir permissões de acesso para usuários anônimos
GRANT SELECT, UPDATE, INSERT ON public.site_content TO anon;
GRANT SELECT, UPDATE, INSERT ON public.site_content TO authenticated;

-- 4. Recriar políticas de leitura (público)
-- A política original "Public read site_content" já existe, não recriar

-- 5. Política para ADMINS: podem fazer tudo na tabela
CREATE POLICY "site_content_admin_all" ON public.site_content
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Política para ANÔNIMOS: podem atualizar e inserir APENAS a seção "clients"
CREATE POLICY "anon_update_clients_only" ON public.site_content
  FOR UPDATE
  TO anon
  USING (section_key = 'clients')
  WITH CHECK (section_key = 'clients');

CREATE POLICY "anon_insert_clients_only" ON public.site_content
  FOR INSERT
  TO anon
  WITH CHECK (section_key = 'clients');
