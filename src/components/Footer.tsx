import { useSiteContent } from "@/hooks/useSiteContent";
import WhatsAppCTA from "./WhatsAppCTA";

const Footer = () => {
  const { data: footerData } = useSiteContent("footer");
  const f = (footerData as any) || {};

  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-6 text-center space-y-6">
        <p className="font-display text-2xl tracking-wider text-gradient-gold">
          {f.brandName || "LIU RECORD"}
        </p>
        <WhatsAppCTA text="Falar agora com atendimento" />
        <p className="font-body text-xs text-muted-foreground">
          © {new Date().getFullYear()} {f.copyright || "Liu Record. Todos os direitos reservados."}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
