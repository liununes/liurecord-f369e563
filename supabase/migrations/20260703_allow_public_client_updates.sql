-- 1. Tentar criar a tabela caso ela não exista (para garantir compatibilidade)
CREATE TABLE IF NOT EXISTS public.site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  content JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Garantir que a tabela tenha RLS ativado
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- 3. Garantir permissões de acesso para usuários anônimos e autenticados
GRANT ALL ON public.site_content TO anon, authenticated;
GRANT ALL ON public.site_content TO service_role;

-- 4. Remover políticas antigas para evitar erros de duplicidade
DROP POLICY IF EXISTS "Allow public update clients" ON public.site_content;
DROP POLICY IF EXISTS "Allow public insert clients" ON public.site_content;
DROP POLICY IF EXISTS "Public can update clients selections" ON public.site_content;
DROP POLICY IF EXISTS "Public can insert clients data" ON public.site_content;
DROP POLICY IF EXISTS "Public read site_content" ON public.site_content;

-- 5. Criar as novas políticas de acesso
-- Permite leitura pública para que o site funcione
CREATE POLICY "Public read site_content" ON public.site_content FOR SELECT USING (true);

-- Permite que clientes atualizem suas fotos (onde section_key é 'clients') sem precisar de login no Supabase
CREATE POLICY "Allow public update clients" ON public.site_content 
FOR UPDATE 
TO anon, authenticated
USING (section_key = 'clients')
WITH CHECK (section_key = 'clients');

-- Permite que novos dados de clientes sejam inseridos se necessário
CREATE POLICY "Allow public insert clients" ON public.site_content 
FOR INSERT 
TO anon, authenticated
WITH CHECK (section_key = 'clients');
