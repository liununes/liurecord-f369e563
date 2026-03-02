import { Radio, Volume2, Camera, Film, Share2 } from "lucide-react";
import aerialImg from "@/assets/aerial.jpg";
import filmingImg from "@/assets/filming.jpg";
import socialImg from "@/assets/social-media.jpg";
import { useSiteContent } from "@/hooks/useSiteContent";
import WhatsAppCTA from "./WhatsAppCTA";

const iconMap: Record<string, any> = { Radio, Volume2, Camera, Film, Share2 };
const fallbackImageMap: Record<string, string> = {
  "captacao-aerea": aerialImg,
  filmagens: filmingImg,
  "social-media": socialImg,
};

const defaultServices = [
  { id: "audios", iconName: "Volume2", title: "Áudios", description: "Produção de áudios profissionais para rádio, carro de som, TV, redes sociais e campanhas publicitárias." },
  { id: "captacao-aerea", iconName: "Camera", title: "Captação Aérea", description: "Imagens aéreas com drones profissionais." },
  { id: "filmagens", iconName: "Film", title: "Filmagens", description: "Produção de vídeos profissionais." },
  { id: "social-media", iconName: "Share2", title: "Social Media", description: "Gestão completa de redes sociais." },
];

const ServicesSection = () => {
  const { data: servicesData } = useSiteContent("services");
  const services = (Array.isArray(servicesData) ? servicesData : defaultServices) as any[];

  return (
    <section id="servicos" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.3em] text-primary font-body mb-3">O que fazemos</p>
          <h2 className="font-display text-5xl md:text-6xl tracking-wider text-foreground">Nossos Serviços</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service: any) => {
            const Icon = iconMap[service.iconName] || Radio;
            const img = service.image_url || fallbackImageMap[service.id];
            return (
              <div key={service.id} className="group relative bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-all duration-500 hover:shadow-gold">
                {img && (
                  <div className="h-48 overflow-hidden">
                    <img src={img} alt={service.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                )}
                <div className="p-8">
                  <Icon className="text-primary mb-4" size={32} />
                  <h3 className="font-display text-2xl tracking-wider text-foreground mb-3">{service.title}</h3>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed">{service.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <WhatsAppCTA text="Solicitar orçamento no WhatsApp" />
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
