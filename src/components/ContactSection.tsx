import { useState } from "react";
import { Mail, Phone, MapPin, Send, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSiteContent } from "@/hooks/useSiteContent";
import emailjs from "@emailjs/browser";

const EMAILJS_SERVICE_ID = "service_liurecord";
const EMAILJS_TEMPLATE_ID = "template_liurecord";
const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY";

const ContactSection = () => {
  const { data: contactData } = useSiteContent("contact");
  const { data: settingsData } = useSiteContent("settings");
  const c = (contactData as any) || {};
  const s = (settingsData as any) || {};

  const whatsappNumber = s.whatsapp_number || c.whatsappNumber || "5533999837414";
  const whatsappMessage = s.whatsapp_message || "Olá! Gostaria de saber mais sobre os serviços da Liu Record.";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const validate = () => {
    if (!formData.name.trim()) { toast.error("Preencha seu nome."); return false; }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) { toast.error("Preencha um e-mail válido."); return false; }
    if (!formData.message.trim()) { toast.error("Preencha a mensagem."); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSending(true);
    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name: formData.name,
          from_email: formData.email,
          phone: formData.phone,
          service: formData.service,
          message: formData.message,
          to_email: s.contact_email || "liununes06@gmail.com",
        },
        EMAILJS_PUBLIC_KEY
      );
      setSent(true);
      toast.success("Mensagem enviada com sucesso! Em breve entraremos em contato.");
      setFormData({ name: "", email: "", phone: "", service: "", message: "" });
      // Redirect to WhatsApp after 3 seconds
      setTimeout(() => {
        const url = `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`;
        window.open(url, "_blank");
      }, 3000);
    } catch {
      toast.error("Erro ao enviar mensagem. Tente novamente ou entre em contato pelo WhatsApp.");
    } finally {
      setSending(false);
    }
  };

  const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`;

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
                  <p className="font-body text-foreground">{c.phone || "(33) 99983-7414"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"><Mail className="text-primary" size={20} /></div>
                <div>
                  <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">E-mail</p>
                  <p className="font-body text-foreground">{s.contact_email || c.email || "liununes06@gmail.com"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"><MapPin className="text-primary" size={20} /></div>
                <div>
                  <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">Localização</p>
                  <p className="font-body text-foreground">{c.location || "Itambacuri-MG"}</p>
                </div>
              </div>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 text-white font-body font-semibold px-6 py-3 rounded-md hover:bg-green-700 transition-colors"
            >
              <MessageCircle size={18} /> Falar no WhatsApp
            </a>
          </div>

          {sent ? (
            <div className="flex flex-col items-center justify-center text-center space-y-4 bg-card border border-border rounded-lg p-8">
              <div className="w-16 h-16 rounded-full bg-green-600/20 flex items-center justify-center">
                <MessageCircle className="text-green-500" size={28} />
              </div>
              <h3 className="font-display text-2xl text-foreground">Mensagem enviada!</h3>
              <p className="font-body text-muted-foreground text-sm">Em breve entraremos em contato. Redirecionando para o WhatsApp...</p>
              <button onClick={() => setSent(false)} className="font-body text-primary text-sm underline">Enviar outra mensagem</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <input type="text" placeholder="Seu nome" required maxLength={100} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-card border border-border rounded-md px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                <input type="email" placeholder="Seu e-mail" required maxLength={255} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-card border border-border rounded-md px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <input type="tel" placeholder="WhatsApp" maxLength={20} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-card border border-border rounded-md px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                <select value={formData.service} onChange={(e) => setFormData({ ...formData, service: e.target.value })} className="w-full bg-card border border-border rounded-md px-4 py-3 font-body text-sm text-foreground focus:outline-none focus:border-primary transition-colors">
                  <option value="">Selecione o serviço</option>
                  <option value="audios">Áudios (Rádio, Carro de Som, TV)</option>
                  <option value="captacao-aerea">Captação Aérea</option>
                  <option value="filmagens">Filmagens</option>
                  <option value="social-media">Social Media</option>
                </select>
              </div>
              <textarea placeholder="Descreva seu projeto..." required maxLength={1000} rows={5} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="w-full bg-card border border-border rounded-md px-4 py-3 font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none" />
              <button type="submit" disabled={sending} className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground font-body font-semibold px-8 py-4 rounded-md hover:opacity-90 transition-opacity w-full justify-center disabled:opacity-50">
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {sending ? "Enviando..." : "Enviar Mensagem"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
