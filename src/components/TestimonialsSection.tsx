import { Star } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";

const defaultTestimonials = [
  { name: "João Ribeiro", role: "Comerciante, Almenara/MG", text: "O áudio para carro de som ficou excelente, voz marcante e entrega muito rápida." },
];

const TestimonialsSection = () => {
  const { data: testimonialsData } = useSiteContent("testimonials");
  const testimonials = (Array.isArray(testimonialsData) ? testimonialsData : defaultTestimonials) as any[];

  return (
    <section className="py-24 bg-secondary/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.3em] text-primary font-body mb-3">Depoimentos</p>
          <h2 className="font-display text-5xl md:text-6xl tracking-wider text-foreground">O que dizem nossos clientes</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t: any, i: number) => (
            <div key={i} className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} size={14} className="text-primary fill-primary" />
                ))}
              </div>
              <p className="font-body text-sm text-muted-foreground leading-relaxed italic">"{t.text}"</p>
              <div>
                <p className="font-body font-medium text-foreground text-sm">{t.name}</p>
                <p className="font-body text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
