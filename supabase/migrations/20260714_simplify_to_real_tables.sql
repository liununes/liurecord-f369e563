-- ============================================================
-- SIMPLIFICAÇÃO: Tabelas reais para clientes e fotos
-- Remove o blob criptografado do site_content
-- ============================================================

-- 1. Criar tabela de clientes
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  watermark_text TEXT DEFAULT 'LIU RECORD',
  max_photos INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Criar tabela de fotos dos clientes
CREATE TABLE IF NOT EXISTS public.client_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  filename TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'liked', 'disliked')),
  released BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_photos ENABLE ROW LEVEL SECURITY;

-- 4. Políticas simples: todo mundo pode tudo
CREATE POLICY "Allow all on clients" ON public.clients
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on client_photos" ON public.client_photos
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Permissões de acesso
GRANT ALL ON public.clients TO anon, authenticated, service_role;
GRANT ALL ON public.client_photos TO anon, authenticated, service_role;

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_client_photos_client_id ON public.client_photos(client_id);
