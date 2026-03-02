import { MessageCircle, FileText, CheckCircle } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";
import WhatsAppCTA from "./WhatsAppCTA";

const stepIcons = [MessageCircle, FileText, CheckCircle];

const defaultSteps = [
  { step: "1", title: "Chame no WhatsApp", description: "Você chama no WhatsApp e explica o que precisa" },
  { step: "2", title: "Definimos tudo", description: "Definimos o roteiro, prazo e valor" },
  { step: "3", title: "Receba o material", description: "Você recebe o material pronto para divulgar" },
];

const HowItWorksSection = () => {
  const { data: stepsData } = useSiteContent("how_it_works");
  const steps = (Array.isArray(stepsData) ? stepsData : defaultSteps) as any[];

  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.3em] text-primary font-body mb-3">Simples e rápido</p>
          <h2 className="font-display text-5xl md:text-6xl tracking-wider text-foreground">Como Funciona</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
          {steps.map((s: any, i: number) => {
            const Icon = stepIcons[i] || MessageCircle;
            return (
              <div key={i} className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Icon className="text-primary" size={28} />
                </div>
                <div className="font-display text-lg tracking-wider text-primary">{s.step}. {s.title}</div>
                <p className="font-body text-sm text-muted-foreground">{s.description}</p>
              </div>
            );
          })}
        </div>
        <div className="text-center">
          <WhatsAppCTA text="Quero meu áudio profissional" />
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
