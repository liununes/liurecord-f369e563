import { Play, Pause } from "lucide-react";
import { useState, useRef } from "react";

const audioSamples = [
  { title: "Spot Rádio — Promoção Loja", category: "Spot Rádio" },
  { title: "Carro de Som — Evento Municipal", category: "Carro de Som" },
  { title: "Spot Rádio — Restaurante", category: "Spot Rádio" },
  { title: "Carro de Som — Black Friday", category: "Carro de Som" },
];

const PortfolioSection = () => {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const togglePlay = (index: number) => {
    setPlayingIndex(playingIndex === index ? null : index);
  };

  return (
    <section id="portfolio" className="py-24">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.3em] text-primary font-body mb-3">Ouça nossos trabalhos</p>
          <h2 className="font-display text-5xl md:text-6xl tracking-wider text-foreground">
            Portfólio de Áudios
          </h2>
          <p className="font-body text-muted-foreground mt-4 max-w-lg mx-auto">
            Confira alguns dos nossos trabalhos em spots de rádio e carro de som. Entre em contato para solicitar o seu!
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-4">
          {audioSamples.map((sample, index) => (
            <div
              key={index}
              className="flex items-center gap-4 bg-card border border-border rounded-lg p-5 hover:border-primary/40 transition-all duration-300 group cursor-pointer"
              onClick={() => togglePlay(index)}
            >
              <button
                className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground hover:opacity-90 transition-opacity"
                aria-label={playingIndex === index ? "Pausar" : "Reproduzir"}
              >
                {playingIndex === index ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
              </button>
              <div className="flex-1 min-w-0">
                <h4 className="font-body font-medium text-foreground truncate">{sample.title}</h4>
                <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">{sample.category}</p>
              </div>
              {/* Fake waveform */}
              <div className="hidden sm:flex items-end gap-0.5 h-8">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-colors duration-300 ${
                      playingIndex === index ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                    style={{
                      height: `${Math.random() * 100}%`,
                      minHeight: "4px",
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8 font-body">
          * Para ouvir os áudios reais, entre em contato conosco.
        </p>
      </div>
    </section>
  );
};

export default PortfolioSection;
