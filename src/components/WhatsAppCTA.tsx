import { MessageCircle } from "lucide-react";
import { useSiteContent } from "@/hooks/useSiteContent";

interface WhatsAppCTAProps {
  text?: string;
  className?: string;
}

const WhatsAppCTA = ({ text = "Solicitar orçamento no WhatsApp", className = "" }: WhatsAppCTAProps) => {
  const { data: settingsData } = useSiteContent("settings");
  const s = (settingsData as any) || {};
  const number = s.whatsapp_number || "5533999837414";
  const message = s.whatsapp_message || "Olá! Gostaria de saber mais sobre os serviços da Liu Record.";
  const url = `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 bg-green-600 text-white font-body font-semibold px-6 py-3 rounded-md hover:bg-green-700 transition-colors ${className}`}
    >
      <MessageCircle size={18} /> {text}
    </a>
  );
};

export default WhatsAppCTA;
