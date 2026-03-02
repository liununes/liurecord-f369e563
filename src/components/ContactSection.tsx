import { useState } from "react";
import { Mail, Phone, MapPin, Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useSiteContent } from "@/hooks/useSiteContent";

const ContactSection = () => {
  const { data: contactData } = useSiteContent("contact");
  const { data: settingsData } = useSiteContent("settings");
  const c = (contactData as any) || {};
  const s = (settingsData as any) || {};

  const whatsappNumber = s.whatsapp_number || c.whatsappNumber || "";
  const whatsappMessage = s.whatsapp_message || "";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Mensagem enviada com sucesso! Entraremos em contato em breve.");
    setFormData({ name: "", email: "", phone: "", service: "", message: "" });
  };

  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`
    : null;

  return (
    <section id="contato" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.3em] text-primary font-body mb-3">Fale conosco</p>
          <h2 className="font-display text-5xl md:text-6xl tracking-wider text-foreground">Entre em Contato</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <div className="space-y-8">
            <p className="font-body text-muted-foreground leading-relaxed">
              {c.description || "Solicite um orçamento sem compromisso."}
            </p>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"><Phone className="text-primary" size={20} /></div>
                <div>
                  <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Telefone / WhatsApp</p>
                  <p className="font-body text-foreground">{c.phone || "(00) 00000-0000"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"><Mail className="text-primary" size={20} /></div>
                <div>
                  <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">E-mail</p>
                  <p className="font-body text-foreground">{s.contact_email || c.email || "contato@liurecord.com.br"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"><MapPin className="text-primary" size={20} /></div>
                <div>
                  <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Localização</p>
                  <p className="font-body text-foreground">{c.location || "Sua Cidade, Estado"}</p>
                </div>
              </div>
            </div>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-600 text-white font-body font-semibold px-6 py-3 rounded-md hover:bg-green-700 transition-colors"
              >
                <MessageCircle size={18} /> Falar no WhatsApp
              </a>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <input type="text" placeholder="Seu nome" required maxLength={100} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-card border border-border rounded-md px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
              <input type="email" placeholder="Seu e-mail" required maxLength={255} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-card border border-border rounded-md px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <input type="tel" placeholder="WhatsApp" maxLength={20} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-card border border-border rounded-md px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
              <select value={formData.service} onChange={(e) => setFormData({ ...formData, service: e.target.value })} className="w-full bg-card border border-border rounded-md px-4 py-3 font-body text-sm text-foreground focus:outline-none focus:border-primary transition-colors">
                <option value="">Selecione o serviço</option>
                <option value="spot-radio">Spot de Rádio</option>
                <option value="carro-de-som">Carro de Som</option>
                <option value="captacao-aerea">Captação Aérea</option>
                <option value="filmagens">Filmagens</option>
                <option value="social-media">Social Media</option>
              </select>
            </div>
            <textarea placeholder="Descreva seu projeto..." required maxLength={1000} rows={5} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="w-full bg-card border border-border rounded-md px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none" />
            <button type="submit" className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground font-body font-semibold px-8 py-4 rounded-md hover:opacity-90 transition-opacity w-full justify-center">
              <Send size={18} /> Enviar Mensagem
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
