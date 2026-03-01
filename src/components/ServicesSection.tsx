import { Radio, Volume2, Camera, Film, Share2 } from "lucide-react";
import aerialImg from "@/assets/aerial.jpg";
import filmingImg from "@/assets/filming.jpg";
import socialImg from "@/assets/social-media.jpg";

const services = [
  {
    icon: Radio,
    title: "Spot de Rádio",
    description: "Criação de spots publicitários profissionais para rádio com locução, trilha e edição de alta qualidade.",
    image: null,
  },
  {
    icon: Volume2,
    title: "Carro de Som",
    description: "Gravações impactantes para divulgação em carros de som, com voz marcante e trilha envolvente.",
    image: null,
  },
  {
    icon: Camera,
    title: "Captação Aérea",
    description: "Imagens aéreas impressionantes com drones profissionais para eventos, imóveis e produções audiovisuais.",
    image: aerialImg,
  },
  {
    icon: Film,
    title: "Filmagens",
    description: "Produção de vídeos profissionais para empresas, eventos e conteúdo institucional com qualidade cinematográfica.",
    image: filmingImg,
  },
  {
    icon: Share2,
    title: "Social Media",
    description: "Gestão completa de redes sociais com criação de conteúdo, estratégia e acompanhamento de resultados.",
    image: socialImg,
  },
];

const ServicesSection = () => {
  return (
    <section id="servicos" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.3em] text-primary font-body mb-3">O que fazemos</p>
          <h2 className="font-display text-5xl md:text-6xl tracking-wider text-foreground">
            Nossos Serviços
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div
              key={service.title}
              className="group relative bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-all duration-500 hover:shadow-gold"
            >
              {service.image && (
                <div className="h-48 overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
              )}
              <div className="p-8">
                <service.icon className="text-primary mb-4" size={32} />
                <h3 className="font-display text-2xl tracking-wider text-foreground mb-3">
                  {service.title}
                </h3>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
