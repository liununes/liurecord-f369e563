import { useSiteContent } from "@/hooks/useSiteContent";

const Footer = () => {
  const { data: footerData } = useSiteContent("footer");
  const f = (footerData as any) || {};

  return (
    <footer className="py-8 border-t border-border">
      <div className="container mx-auto px-6 text-center">
        <p className="font-display text-2xl tracking-wider text-gradient-gold mb-2">
          {f.brandName || "LIU RECORD"}
        </p>
        <p className="font-body text-xs text-muted-foreground">
          © {new Date().getFullYear()} {f.copyright || "Liu Record. Todos os direitos reservados."}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
