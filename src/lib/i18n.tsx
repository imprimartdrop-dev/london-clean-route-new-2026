/**
 * Lightweight bilingual layer (en-GB default, pt-BR optional).
 * Kept dependency-free so it can move to i18next later without touching pages.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "pt";
const STORAGE_KEY = "lcr-lang";

const en = {
  "brand": "London Clean Route",
  "nav.services": "Services", "nav.how": "How it works", "nav.areas": "Areas", "nav.faqs": "FAQs", "nav.contact": "Contact",
  "cta.quote": "Get a free cleaning quote", "cta.quoteShort": "Free quote", "cta.services": "Explore services",
  "lang.label": "Change language",
  "home.eyebrow": "Domestic & commercial cleaning · North West London",
  "home.title": "Considered cleaning for London homes and workplaces.",
  "home.lead": "Regular housekeeping, deep cleans, end of tenancy and short-let changeovers — quoted personally, scheduled carefully and carried out by a small, attentive team.",
  "home.note": "No obligation. We reply with a tailored quote.",
  "home.servicesTitle": "Six services, one standard",
  "home.servicesLead": "Every visit follows a written checklist agreed with you beforehand.",
  "home.whoTitle": "Who we work with",
  "home.who.residents": "Residents", "home.who.residentsText": "Weekly or fortnightly housekeeping that fits around your routine.",
  "home.who.landlords": "Landlords & letting agents", "home.who.landlordsText": "Move-in and move-out cleans arranged around check-ins and inventories.",
  "home.who.hosts": "Short-let hosts", "home.who.hostsText": "Turnarounds with linen changes, restocks and photo-ready rooms.",
  "home.who.offices": "Small offices", "home.who.officesText": "Early-morning or evening cleans for studios and offices.",
  "home.areasTitle": "Starting in North West London",
  "home.areasLead": "Our first routes cover NW postcodes. Enter yours in the quote form and we will confirm availability.",
  "home.closingTitle": "Tell us about your space.",
  "home.closingLead": "Four short steps, about two minutes. We will review it and come back with a clear price.",
  "services.title": "Cleaning services", "services.lead": "Choose the service that fits — or describe what you need and we will advise.",
  "services.included": "What is typically included", "services.idealFor": "Ideal for", "services.more": "View details",
  "how.title": "How it works", "how.lead": "A simple, transparent process from enquiry to clean.",
  "how.1": "Request a quote", "how.1t": "Tell us the property, service and preferred dates in our short form.",
  "how.2": "We review personally", "how.2t": "We check your postcode against our routes and prepare a tailored price.",
  "how.3": "Confirm your slot", "how.3t": "Agree the price and time window. Nothing is booked until you confirm.",
  "how.4": "Your clean", "how.4t": "Our cleaner follows the agreed checklist and we follow up afterwards.",
  "areas.title": "Areas we cover", "areas.lead": "We are starting with North West London and expanding route by route.",
  "areas.check": "Check your postcode", "areas.placeholder": "e.g. NW6 2AB", "areas.button": "Check",
  "areas.in": "Good news — this looks like one of our initial areas. Request a quote to confirm a slot.",
  "areas.out": "We may not have a regular route there yet, but send a quote request and we will tell you honestly.",
  "areas.invalid": "Please enter a valid UK postcode.",
  "areas.disclaimer": "This is an indicative check only. Availability is confirmed personally after review.",
  "faqs.title": "Frequently asked questions",
  "contact.title": "Contact", "contact.lead": "The quickest way to reach us is the quote form — it gives us everything we need to reply properly.",
  "contact.details": "Contact details", "contact.pending": "Phone, email and WhatsApp details will be published once the business lines are set up.",
  "contact.hours": "Enquiries reviewed Monday to Saturday.",
  "privacy.title": "Privacy & cookies",
  "footer.tagline": "Considered domestic and commercial cleaning in London.",
  "footer.company": "Company", "footer.legal": "Legal", "footer.privacy": "Privacy & cookies", "footer.admin": "Staff",
  "footer.rights": "Provisional brand. Preview build — not yet trading online.",
  "cookie.text": "We use only essential storage (language and this choice). No advertising or analytics cookies are set by this site.",
  "cookie.accept": "Accept", "cookie.reject": "Essential only", "cookie.more": "Read more",
  // Quote
  "q.title": "Your free cleaning quote", "q.lead": "Four short steps. We reply personally with a clear price.",
  "q.pendingTitle": "Integration pending — preview mode",
  "q.pendingText": "Online submission is not connected yet. You can try the full form, but nothing is sent or stored, and no one will contact you from this preview.",
  "q.step": "Step", "q.of": "of",
  "q.s1": "Service & property", "q.s2": "When & where", "q.s3": "Details", "q.s4": "Your details", "q.s5": "Review",
  "q.service": "Type of cleaning", "q.homeType": "Property type",
  "q.home.flat": "Flat / apartment", "q.home.house": "House", "q.home.studio": "Studio", "q.home.office": "Office / commercial", "q.home.other": "Other",
  "q.bedrooms": "Bedrooms", "q.bathrooms": "Bathrooms", "q.size": "Approximate size (sq ft, optional)",
  "q.frequency": "Frequency",
  "q.freq.once": "One-off", "q.freq.weekly": "Weekly", "q.freq.fortnightly": "Fortnightly", "q.freq.monthly": "Monthly", "q.freq.unsure": "Not sure yet",
  "q.postcode": "Postcode", "q.date": "Preferred date", "q.window": "Preferred time window",
  "q.win.morning": "Morning (8–12)", "q.win.afternoon": "Afternoon (12–5)", "q.win.evening": "Evening (5–8)", "q.win.flexible": "Flexible",
  "q.notes": "Anything we should know? (optional)", "q.notesPh": "Pets, access, parking, priority rooms, oven clean…",
  "q.photos": "Photos (optional, up to 5 images, 8 MB each)", "q.photosHint": "Photos stay on your device in preview mode.",
  "q.name": "Full name", "q.phone": "Phone", "q.phoneHint": "UK (07… or +44) or international format (+351…)", "q.email": "Email",
  "q.privacy": "I have read the privacy notice and agree that my details are used to respond to this enquiry.",
  "q.marketing": "Optional: send me occasional offers and seasonal reminders. You can unsubscribe at any time.",
  "q.back": "Back", "q.next": "Continue", "q.review": "Review enquiry", "q.submit": "Submit preview enquiry", "q.edit": "Edit",
  "q.submitting": "Checking…",
  "q.previewDoneTitle": "Preview only — not sent",
  "q.previewDoneText": "This was a test run. Your enquiry has NOT been delivered to anyone and has not been stored. Reference shown for demonstration:",
  "q.again": "Start a new preview",
  "q.error": "Something went wrong. Please check your details and try again.",
  "q.yes": "Yes", "q.no": "No", "q.none": "—",
  "err.required": "This field is required.", "err.postcode": "Enter a valid UK postcode, e.g. NW6 2AB.",
  "err.phone": "Enter a valid phone number.", "err.email": "Enter a valid email address.", "err.privacy": "Please confirm the privacy notice to continue.",
  "err.date": "Choose today or a future date.", "err.name": "Please enter your name.", "err.tooLong": "Too long.",
  "err.photoType": "Only JPG, PNG, WEBP or HEIC images.", "err.photoSize": "Each photo must be under 8 MB.", "err.photoCount": "Up to 5 photos.",
};
export type DictKey = keyof typeof en;

const pt: Record<DictKey, string> = {
  "brand": "London Clean Route",
  "nav.services": "Serviços", "nav.how": "Como funciona", "nav.areas": "Regiões", "nav.faqs": "Dúvidas", "nav.contact": "Contato",
  "cta.quote": "Peça um orçamento grátis", "cta.quoteShort": "Orçamento", "cta.services": "Ver serviços",
  "lang.label": "Mudar idioma",
  "home.eyebrow": "Limpeza residencial e comercial · Noroeste de Londres",
  "home.title": "Limpeza cuidadosa para casas e escritórios em Londres.",
  "home.lead": "Limpeza regular, faxina pesada, fim de contrato de aluguel e troca de hóspedes — com orçamento pessoal, agenda cuidadosa e uma equipe pequena e atenta.",
  "home.note": "Sem compromisso. Respondemos com um orçamento sob medida.",
  "home.servicesTitle": "Seis serviços, um só padrão",
  "home.servicesLead": "Cada visita segue um checklist escrito, combinado com você antes.",
  "home.whoTitle": "Para quem trabalhamos",
  "home.who.residents": "Moradores", "home.who.residentsText": "Limpeza semanal ou quinzenal que se encaixa na sua rotina.",
  "home.who.landlords": "Proprietários e imobiliárias", "home.who.landlordsText": "Limpezas de entrada e saída alinhadas com vistorias.",
  "home.who.hosts": "Anfitriões de temporada", "home.who.hostsText": "Trocas com roupa de cama, reposição e quartos prontos para foto.",
  "home.who.offices": "Pequenos escritórios", "home.who.officesText": "Limpezas cedo ou à noite para estúdios e escritórios.",
  "home.areasTitle": "Começando pelo Noroeste de Londres",
  "home.areasLead": "Nossas primeiras rotas cobrem os códigos NW. Informe o seu no formulário e confirmamos a disponibilidade.",
  "home.closingTitle": "Conte-nos sobre o seu espaço.",
  "home.closingLead": "Quatro passos rápidos, cerca de dois minutos. Analisamos e voltamos com um preço claro.",
  "services.title": "Serviços de limpeza", "services.lead": "Escolha o serviço ideal — ou descreva o que precisa e nós orientamos.",
  "services.included": "O que normalmente inclui", "services.idealFor": "Ideal para", "services.more": "Ver detalhes",
  "how.title": "Como funciona", "how.lead": "Um processo simples e transparente, do pedido à limpeza.",
  "how.1": "Peça um orçamento", "how.1t": "Informe o imóvel, o serviço e as datas preferidas no formulário.",
  "how.2": "Análise pessoal", "how.2t": "Verificamos seu código postal nas nossas rotas e preparamos um preço sob medida.",
  "how.3": "Confirme o horário", "how.3t": "Combine preço e janela de horário. Nada é agendado sem sua confirmação.",
  "how.4": "Sua limpeza", "how.4t": "A profissional segue o checklist combinado e fazemos o acompanhamento depois.",
  "areas.title": "Regiões atendidas", "areas.lead": "Começamos pelo Noroeste de Londres e vamos expandindo rota a rota.",
  "areas.check": "Verifique seu código postal", "areas.placeholder": "ex.: NW6 2AB", "areas.button": "Verificar",
  "areas.in": "Ótimo — parece ser uma das nossas regiões iniciais. Peça um orçamento para confirmar um horário.",
  "areas.out": "Talvez ainda não tenhamos rota fixa aí, mas envie o pedido e responderemos com sinceridade.",
  "areas.invalid": "Informe um código postal britânico válido.",
  "areas.disclaimer": "Verificação apenas indicativa. A disponibilidade é confirmada pessoalmente após análise.",
  "faqs.title": "Perguntas frequentes",
  "contact.title": "Contato", "contact.lead": "A forma mais rápida de falar conosco é o formulário de orçamento — ele traz tudo que precisamos para responder bem.",
  "contact.details": "Dados de contato", "contact.pending": "Telefone, e-mail e WhatsApp serão publicados assim que as linhas comerciais estiverem prontas.",
  "contact.hours": "Pedidos analisados de segunda a sábado.",
  "privacy.title": "Privacidade e cookies",
  "footer.tagline": "Limpeza residencial e comercial cuidadosa em Londres.",
  "footer.company": "Empresa", "footer.legal": "Legal", "footer.privacy": "Privacidade e cookies", "footer.admin": "Equipe",
  "footer.rights": "Marca provisória. Versão de prévia — ainda sem operação online.",
  "cookie.text": "Usamos apenas armazenamento essencial (idioma e esta escolha). Este site não define cookies de publicidade ou análise.",
  "cookie.accept": "Aceitar", "cookie.reject": "Apenas essenciais", "cookie.more": "Saiba mais",
  "q.title": "Seu orçamento de limpeza grátis", "q.lead": "Quatro passos rápidos. Respondemos pessoalmente com um preço claro.",
  "q.pendingTitle": "Integração pendente — modo de prévia",
  "q.pendingText": "O envio online ainda não está conectado. Você pode testar todo o formulário, mas nada é enviado ou armazenado, e ninguém entrará em contato a partir desta prévia.",
  "q.step": "Passo", "q.of": "de",
  "q.s1": "Serviço e imóvel", "q.s2": "Quando e onde", "q.s3": "Detalhes", "q.s4": "Seus dados", "q.s5": "Revisão",
  "q.service": "Tipo de limpeza", "q.homeType": "Tipo de imóvel",
  "q.home.flat": "Apartamento", "q.home.house": "Casa", "q.home.studio": "Estúdio", "q.home.office": "Escritório / comercial", "q.home.other": "Outro",
  "q.bedrooms": "Quartos", "q.bathrooms": "Banheiros", "q.size": "Tamanho aproximado (pés², opcional)",
  "q.frequency": "Frequência",
  "q.freq.once": "Avulsa", "q.freq.weekly": "Semanal", "q.freq.fortnightly": "Quinzenal", "q.freq.monthly": "Mensal", "q.freq.unsure": "Ainda não sei",
  "q.postcode": "Código postal", "q.date": "Data preferida", "q.window": "Janela de horário",
  "q.win.morning": "Manhã (8–12)", "q.win.afternoon": "Tarde (12–17)", "q.win.evening": "Noite (17–20)", "q.win.flexible": "Flexível",
  "q.notes": "Algo que devemos saber? (opcional)", "q.notesPh": "Animais, acesso, estacionamento, cômodos prioritários, forno…",
  "q.photos": "Fotos (opcional, até 5 imagens, 8 MB cada)", "q.photosHint": "No modo de prévia, as fotos ficam no seu dispositivo.",
  "q.name": "Nome completo", "q.phone": "Telefone", "q.phoneHint": "Reino Unido (07… ou +44) ou internacional (+55…)", "q.email": "E-mail",
  "q.privacy": "Li o aviso de privacidade e concordo que meus dados sejam usados para responder a este pedido.",
  "q.marketing": "Opcional: quero receber ofertas e lembretes ocasionais. Posso cancelar quando quiser.",
  "q.back": "Voltar", "q.next": "Continuar", "q.review": "Revisar pedido", "q.submit": "Enviar pedido de prévia", "q.edit": "Editar",
  "q.submitting": "Verificando…",
  "q.previewDoneTitle": "Apenas prévia — não enviado",
  "q.previewDoneText": "Isto foi um teste. Seu pedido NÃO foi entregue a ninguém e não foi armazenado. Referência apenas demonstrativa:",
  "q.again": "Começar nova prévia",
  "q.error": "Algo deu errado. Confira seus dados e tente novamente.",
  "q.yes": "Sim", "q.no": "Não", "q.none": "—",
  "err.required": "Campo obrigatório.", "err.postcode": "Informe um código postal válido, ex.: NW6 2AB.",
  "err.phone": "Informe um telefone válido.", "err.email": "Informe um e-mail válido.", "err.privacy": "Confirme o aviso de privacidade para continuar.",
  "err.date": "Escolha hoje ou uma data futura.", "err.name": "Informe seu nome.", "err.tooLong": "Muito longo.",
  "err.photoType": "Apenas imagens JPG, PNG, WEBP ou HEIC.", "err.photoSize": "Cada foto deve ter menos de 8 MB.", "err.photoCount": "Até 5 fotos.",
};

const dictionaries: Record<Lang, Record<DictKey, string>> = { en, pt };

interface I18nValue { lang: Lang; setLang: (l: Lang) => void; t: (k: DictKey) => string; }
const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Always render en-GB on the server; apply a stored preference after hydration.
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "pt" || stored === "en") setLangState(stored);
  }, []);
  useEffect(() => { document.documentElement.lang = lang === "pt" ? "pt-BR" : "en-GB"; }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { window.localStorage.setItem(STORAGE_KEY, l); } catch { /* storage unavailable */ }
  }, []);
  const value = useMemo<I18nValue>(() => ({ lang, setLang, t: (k) => dictionaries[lang][k] ?? en[k] }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

/** Pick a bilingual value from content objects shaped { en, pt }. */
export type Localised = { en: string; pt: string };
export const pick = (v: Localised, lang: Lang) => v[lang];
