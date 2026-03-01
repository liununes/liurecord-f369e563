const Footer = () => {
  return (
    <footer className="py-8 border-t border-border">
      <div className="container mx-auto px-6 text-center">
        <p className="font-display text-2xl tracking-wider text-gradient-gold mb-2">LIU RECORD</p>
        <p className="font-body text-xs text-muted-foreground">
          © {new Date().getFullYear()} Liu Record. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
