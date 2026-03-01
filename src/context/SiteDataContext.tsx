import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HeroData {
  subtitle: string;
  title: string;
  titleHighlight: string;
  description: string;
  primaryButtonText: string;
  primaryButtonHref: string;
  secondaryButtonText: string;
  secondaryButtonHref: string;
}

export interface ServiceItem {
  id: string;
  iconName: string;
  title: string;
  description: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  audioUrl?: string;
}

export interface ContactData {
  phone: string;
  email: string;
  location: string;
  description: string;
  whatsappNumber: string;
}

export interface FooterData {
  brandName: string;
  copyright: string;
}

export interface SiteData {
  hero: HeroData;
  services: ServiceItem[];
  portfolio: PortfolioItem[];
  contact: ContactData;
  footer: FooterData;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const defaultData: SiteData = {
  hero: {
    subtitle: "Produção de Áudio & Vídeo",
    title: "LIU",
    titleHighlight: "RECORD",
    description:
      "Spots de rádio, carro de som, captação aérea, filmagens profissionais e gestão de redes sociais.",
    primaryButtonText: "Ouça Nossos Trabalhos",
    primaryButtonHref: "#portfolio",
    secondaryButtonText: "Fale Conosco",
    secondaryButtonHref: "#contato",
  },
  services: [
    {
      id: "spot-radio",
      iconName: "Radio",
      title: "Spot de Rádio",
      description:
        "Criação de spots publicitários profissionais para rádio com locução, trilha e edição de alta qualidade.",
    },
    {
      id: "carro-de-som",
      iconName: "Volume2",
      title: "Carro de Som",
      description:
        "Gravações impactantes para divulgação em carros de som, com voz marcante e trilha envolvente.",
    },
    {
      id: "captacao-aerea",
      iconName: "Camera",
      title: "Captação Aérea",
      description:
        "Imagens aéreas impressionantes com drones profissionais para eventos, imóveis e produções audiovisuais.",
    },
    {
      id: "filmagens",
      iconName: "Film",
      title: "Filmagens",
      description:
        "Produção de vídeos profissionais para empresas, eventos e conteúdo institucional com qualidade cinematográfica.",
    },
    {
      id: "social-media",
      iconName: "Share2",
      title: "Social Media",
      description:
        "Gestão completa de redes sociais com criação de conteúdo, estratégia e acompanhamento de resultados.",
    },
  ],
  portfolio: [
    { id: "p1", title: "Spot Rádio — Promoção Loja", category: "Spot Rádio", audioUrl: "" },
    { id: "p2", title: "Carro de Som — Evento Municipal", category: "Carro de Som", audioUrl: "" },
    { id: "p3", title: "Spot Rádio — Restaurante", category: "Spot Rádio", audioUrl: "" },
    { id: "p4", title: "Carro de Som — Black Friday", category: "Carro de Som", audioUrl: "" },
  ],
  contact: {
    phone: "(00) 00000-0000",
    email: "contato@liurecord.com.br",
    location: "Sua Cidade, Estado",
    description:
      "Solicite um orçamento sem compromisso. Estamos prontos para transformar sua ideia em um projeto profissional.",
    whatsappNumber: "",
  },
  footer: {
    brandName: "LIU RECORD",
    copyright: "Liu Record. Todos os direitos reservados.",
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface SiteDataContextType {
  data: SiteData;
  updateHero: (hero: HeroData) => void;
  updateServices: (services: ServiceItem[]) => void;
  updatePortfolio: (portfolio: PortfolioItem[]) => void;
  updateContact: (contact: ContactData) => void;
  updateFooter: (footer: FooterData) => void;
  resetToDefaults: () => void;
}

const SiteDataContext = createContext<SiteDataContextType | undefined>(undefined);

const STORAGE_KEY = "liurecord_site_data";

function loadFromStorage(): SiteData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;
    const parsed = JSON.parse(raw) as Partial<SiteData>;
    // Deep merge with defaults to handle new fields added later
    return {
      hero: { ...defaultData.hero, ...parsed.hero },
      services: parsed.services ?? defaultData.services,
      portfolio: parsed.portfolio ?? defaultData.portfolio,
      contact: { ...defaultData.contact, ...parsed.contact },
      footer: { ...defaultData.footer, ...parsed.footer },
    };
  } catch {
    return defaultData;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const SiteDataProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<SiteData>(loadFromStorage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const updateHero = (hero: HeroData) => setData((prev) => ({ ...prev, hero }));
  const updateServices = (services: ServiceItem[]) => setData((prev) => ({ ...prev, services }));
  const updatePortfolio = (portfolio: PortfolioItem[]) => setData((prev) => ({ ...prev, portfolio }));
  const updateContact = (contact: ContactData) => setData((prev) => ({ ...prev, contact }));
  const updateFooter = (footer: FooterData) => setData((prev) => ({ ...prev, footer }));
  const resetToDefaults = () => {
    localStorage.removeItem(STORAGE_KEY);
    setData(defaultData);
  };

  return (
    <SiteDataContext.Provider
      value={{ data, updateHero, updateServices, updatePortfolio, updateContact, updateFooter, resetToDefaults }}
    >
      {children}
    </SiteDataContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useSiteData = () => {
  const ctx = useContext(SiteDataContext);
  if (!ctx) throw new Error("useSiteData must be used within SiteDataProvider");
  return ctx;
};

export { defaultData };
