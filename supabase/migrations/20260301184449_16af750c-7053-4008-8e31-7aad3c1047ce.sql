
-- Site content sections (hero, services, contact, footer texts)
CREATE TABLE public.site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  content JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Theme/colors configuration
CREATE TABLE public.site_theme (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Portfolio media (audio, video, images)
CREATE TABLE public.portfolio_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('audio', 'video', 'image')),
  file_url TEXT,
  thumbnail_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_theme ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_media ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables (site is public)
CREATE POLICY "Public read site_content" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "Public read site_theme" ON public.site_theme FOR SELECT USING (true);
CREATE POLICY "Public read portfolio_media" ON public.portfolio_media FOR SELECT USING (true);

-- Admin role for write access
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admin write policies
CREATE POLICY "Admins can insert site_content" ON public.site_content FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update site_content" ON public.site_content FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete site_content" ON public.site_content FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert site_theme" ON public.site_theme FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update site_theme" ON public.site_theme FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete site_theme" ON public.site_theme FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert portfolio_media" ON public.portfolio_media FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update portfolio_media" ON public.portfolio_media FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete portfolio_media" ON public.portfolio_media FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for media files
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true);

CREATE POLICY "Public read media" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Admins can upload media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update media" ON storage.objects FOR UPDATE USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete media" ON storage.objects FOR DELETE USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));

-- Seed default content
INSERT INTO public.site_content (section_key, content) VALUES
  ('hero', '{"subtitle":"Produção de Áudio & Vídeo","title":"LIU","titleHighlight":"RECORD","description":"Spots de rádio, carro de som, captação aérea, filmagens profissionais e gestão de redes sociais.","primaryButtonText":"Ouça Nossos Trabalhos","primaryButtonHref":"#portfolio","secondaryButtonText":"Fale Conosco","secondaryButtonHref":"#contato"}'),
  ('contact', '{"phone":"(00) 00000-0000","email":"contato@liurecord.com.br","location":"Sua Cidade, Estado","description":"Solicite um orçamento sem compromisso.","whatsappNumber":""}'),
  ('footer', '{"brandName":"LIU RECORD","copyright":"Liu Record. Todos os direitos reservados."}'),
  ('services', '[{"id":"spot-radio","iconName":"Radio","title":"Spot de Rádio","description":"Criação de spots publicitários profissionais para rádio com locução, trilha e edição de alta qualidade."},{"id":"carro-de-som","iconName":"Volume2","title":"Carro de Som","description":"Gravações impactantes para divulgação em carros de som, com voz marcante e trilha envolvente."},{"id":"captacao-aerea","iconName":"Camera","title":"Captação Aérea","description":"Imagens aéreas impressionantes com drones profissionais para eventos, imóveis e produções audiovisuais."},{"id":"filmagens","iconName":"Film","title":"Filmagens","description":"Produção de vídeos profissionais para empresas, eventos e conteúdo institucional com qualidade cinematográfica."},{"id":"social-media","iconName":"Share2","title":"Social Media","description":"Gestão completa de redes sociais com criação de conteúdo, estratégia e acompanhamento de resultados."}]');

-- Seed default theme colors
INSERT INTO public.site_theme (theme_key, value) VALUES
  ('background', '30 10% 8%'),
  ('foreground', '40 20% 92%'),
  ('primary', '38 90% 55%'),
  ('primary-foreground', '30 10% 8%'),
  ('secondary', '30 8% 18%'),
  ('secondary-foreground', '40 20% 85%'),
  ('card', '30 8% 12%'),
  ('card-foreground', '40 20% 92%'),
  ('muted', '30 6% 16%'),
  ('muted-foreground', '30 10% 55%'),
  ('accent', '38 90% 55%'),
  ('accent-foreground', '30 10% 8%'),
  ('border', '30 8% 20%');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_site_content_updated BEFORE UPDATE ON public.site_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_site_theme_updated BEFORE UPDATE ON public.site_theme FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_portfolio_media_updated BEFORE UPDATE ON public.portfolio_media FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
