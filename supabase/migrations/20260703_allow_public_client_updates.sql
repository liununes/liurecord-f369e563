-- Política para permitir que clientes públicos atualizem suas seleções de fotos (section_key = 'clients')
-- Esta política permite UPDATE na tabela site_content apenas para o registro 'clients'
-- sem autenticação, permitindo que clientes salvem suas seleções de curtidas/dispensas

-- Remover políticas antigas se existirem para evitar conflitos
DROP POLICY IF EXISTS "Public can update clients selections" ON public.site_content;
DROP POLICY IF EXISTS "Public can insert clients data" ON public.site_content;

-- Garantir que a tabela site_content permita operações de anon e authenticated
GRANT ALL ON public.site_content TO anon, authenticated;

-- Política para permitir que qualquer pessoa (incluindo anon) atualize a seção 'clients'
CREATE POLICY "Allow public update clients" ON public.site_content 
FOR UPDATE 
TO anon, authenticated
USING (section_key = 'clients')
WITH CHECK (section_key = 'clients');

-- Política para permitir que qualquer pessoa (incluindo anon) insira na seção 'clients'
CREATE POLICY "Allow public insert clients" ON public.site_content 
FOR INSERT 
TO anon, authenticated
WITH CHECK (section_key = 'clients');
