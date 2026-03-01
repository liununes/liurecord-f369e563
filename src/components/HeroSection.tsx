import heroBg from "@/assets/hero-bg.jpg";
import { Play } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";

const HeroSection = () => {
  const { data: hero } = useSiteContent("hero");
  const h = hero as any;

  return (
    <section id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroBg} alt="Estúdio de gravação Liu Record" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-background/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
      </div>

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <p className="font-body text-sm uppercase tracking-[0.4em] text-primary mb-6 animate-fade-in opacity-0" style={{ animationDelay: "0.2s" }}>
          {h?.subtitle ?? "Produção de Áudio & Vídeo"}
        </p>
        <h1 className="font-display text-6xl md:text-8xl lg:text-9xl leading-none tracking-wider text-foreground mb-6 animate-fade-in-up opacity-0" style={{ animationDelay: "0.4s" }}>
          {h?.title ?? "LIU"} <span className="text-gradient-gold">{h?.titleHighlight ?? "RECORD"}</span>
        </h1>
        <p className="font-body text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in-up opacity-0" style={{ animationDelay: "0.6s" }}>
          {h?.description ?? "Spots de rádio, carro de som, captação aérea, filmagens profissionais e gestão de redes sociais."}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up opacity-0" style={{ animationDelay: "0.8s" }}>
          <a href={h?.primaryButtonHref ?? "#portfolio"} className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground font-body font-semibold px-8 py-4 rounded-md hover:opacity-90 transition-opacity">
            <Play size={18} />
            {h?.primaryButtonText ?? "Ouça Nossos Trabalhos"}
          </a>
          <a href={h?.secondaryButtonHref ?? "#contato"} className="inline-flex items-center gap-2 border border-primary text-primary font-body font-semibold px-8 py-4 rounded-md hover:bg-primary hover:text-primary-foreground transition-colors">
            {h?.secondaryButtonText ?? "Fale Conosco"}
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
