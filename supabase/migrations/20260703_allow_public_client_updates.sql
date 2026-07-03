-- Política para permitir que clientes públicos atualizem suas seleções de fotos (section_key = 'clients')
-- Esta política permite UPDATE na tabela site_content apenas para o registro 'clients'
-- sem autenticação, permitindo que clientes salvem suas seleções de curtidas/dispensas

CREATE POLICY "Public can update clients selections" ON public.site_content 
FOR UPDATE 
USING (section_key = 'clients')
WITH CHECK (section_key = 'clients');

-- Política para permitir INSERT de dados de clientes (caso necessário)
CREATE POLICY "Public can insert clients data" ON public.site_content 
FOR INSERT 
WITH CHECK (section_key = 'clients');
