import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { useI18n, type DictKey } from "@/lib/i18n";

const NAV: { href: string; k: DictKey }[] = [
  { href: "/#services", k: "nav.services" },
  { href: "/#how", k: "nav.how" },
  { href: "/#areas", k: "nav.areas" },
  { href: "/#faqs", k: "nav.faqs" },
  { href: "/#contact", k: "nav.contact" },
];

export function LangToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <div role="group" aria-label={t("lang.label")} className="flex items-center gap-1">
      <button type="button" onClick={() => setLang("en")} aria-label="English (United Kingdom)" title="English (United Kingdom)"
        aria-pressed={lang === "en"} className={"rounded-md px-2 py-1.5 text-xl transition-colors "+ (lang === "en" ? "bg-[#e1ebdf] ring-1 ring-[#74917c]" : "hover:bg-[#ebeee7] opacity-60")}>
        <span aria-hidden="true">🇬🇧</span>
      </button>
      <button type="button" onClick={() => setLang("pt")} aria-label="Português (Brasil)" title="Português (Brasil)"
        aria-pressed={lang === "pt"} className={"rounded-md px-2 py-1.5 text-xl transition-colors "+ (lang === "pt" ? "bg-[#e1ebdf] ring-1 ring-[#74917c]" : "hover:bg-[#ebeee7] opacity-60")}>
        <span aria-hidden="true">🇧🇷</span>
      </button>
    </div>
  );
}

export function Header() {
  const { lang, t } = useI18n();
  const [mobile, setMobile] = useState(false);
  return (
    <header className="sticky top-0 z-50 bg-[#fcfbf8]/95 backdrop-blur-lg border-b border-[#e0e7dc]">
      <div className="container-page flex items-center justify-between gap-3 h-[76px]">
        <Link to="/" className="flex flex-col shrink-0 text-[#234737] leading-none">
          <span className="font-display text-xl sm:text-2xl tracking-[-.03em]">London Clean Route</span>
          <span className="text-[9px] tracking-[.19em] mt-1.5 uppercase text-[#66816d]">{lang === "en" ? "Thoughtful cleaning" : "Limpeza com cuidado"}</span>
        </Link>
        <nav aria-label={lang === "en" ? "Primary navigation" : "Navegação principal"} className="hidden xl:flex items-center gap-6">
          {NAV.map(n => <a key={n.href} href={n.href} className="text-sm font-medium text-[#536958] hover:text-[#244936] transition-colors">{t(n.k)}</a>)}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <LangToggle/>
          <a href="/#quote" className="hidden sm:inline-flex items-center gap-2 px-4 py-3 rounded-[3px] bg-[#234a3d] text-white text-sm font-semibold hover:bg-[#163c30]">
            {t("cta.quoteShort")} <ArrowRight size={16}/>
          </a>
          <button type="button" onClick={() => setMobile(v => !v)} aria-label={mobile ? (lang === "en" ? "Close menu" : "Fechar menu") : (lang === "en" ? "Open menu" : "Abrir menu")}
            aria-expanded={mobile} className="xl:hidden p-2 text-[#284e3d]">{mobile ? <X size={23}/> : <Menu size={23}/>}</button>
        </div>
      </div>
      {mobile && <nav aria-label={lang==="en"?"Mobile navigation":"Navegação móvel"} className="xl:hidden bg-[#fcfbf8] border-t border-[#e0e7dc] px-6 py-4 flex flex-col gap-1">
        {NAV.map(n => <a key={n.href} href={n.href} onClick={()=>setMobile(false)} className="py-3 text-sm text-[#344f3d] border-b border-[#edf1e9]">{t(n.k)}</a>)}
        <a href="/#quote" onClick={()=>setMobile(false)} className="bg-[#244c3b] mt-3 py-3 text-center text-white text-sm font-semibold">{t("cta.quote")}</a>
      </nav>}
    </header>
  );
}

export function Footer() {
  const { lang, t } = useI18n();
  return (
    <footer className="bg-[#162e25] text-[#f4f3eb]">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <p className="font-display text-3xl">London Clean Route</p>
          <p className="mt-4 max-w-xs text-sm text-white/60 leading-relaxed">{t("footer.tagline")}</p>
          <a href="/#quote" className="inline-flex items-center gap-2 border-b border-[#8aab97] mt-7 pb-2 text-sm font-semibold">{t("cta.quote")} <ArrowRight size={17}/></a>
        </div>
        <div className="text-sm space-y-3">
          <p className="uppercase tracking-[.14em] text-[#a9c1ad] text-xs mb-5">{t("footer.company")}</p>
          {NAV.map(n => <a key={n.href} href={n.href} className="block opacity-75 hover:opacity-100">{t(n.k)}</a>)}
        </div>
        <div className="text-sm space-y-3" id="privacy">
          <p className="uppercase tracking-[.14em] text-[#a9c1ad] text-xs mb-5">{t("footer.legal")}</p>
          <p className="opacity-75 leading-relaxed">{lang === "en"
            ? "Preview site. The quote form is not connected; any details entered are not submitted to us. A full privacy notice and verified business contact details will be provided before launch."
            : "Site em prévia. O formulário não está conectado; os dados preenchidos não são enviados. A política de privacidade completa e os dados comerciais serão publicados antes do lançamento."}</p>
        </div>
      </div>
      <div className="container-page py-6 border-t border-white/15 flex flex-wrap items-center justify-between gap-4 text-xs text-white/55">
        <span>© {new Date().getFullYear()} London Clean Route · London, UK</span>
        <span>{t("footer.rights")}</span>
      </div>
    </footer>
  );
}

export function CookieConsent() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { if (!localStorage.getItem("lcr-consent")) setShow(true); } catch { setShow(true); }
  }, []);
  if (!show) return null;
  const save = (value: string) => {
    try {localStorage.setItem("lcr-consent", value);} catch { /* storage blocked */ }
    setShow(false);
  };
  return (
    <div role="dialog" aria-label={t("footer.privacy")} className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-xl border border-[#d1ddd0] bg-[#fcfbf8] rounded-lg p-5 shadow-2xl">
      <p className="text-sm text-[#415b48] leading-relaxed">{t("cookie.text")} <a href="/#privacy" className="underline">{t("cookie.more")}</a></p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={() => save("all")} type="button" className="bg-[#234a3d] text-white text-sm py-2.5 px-5 rounded-sm">{t("cookie.accept")}</button>
        <button onClick={() => save("essential")} type="button" className="border border-[#c8d5c7] text-sm py-2.5 px-5 rounded-sm">{t("cookie.reject")}</button>
      </div>
    </div>
  );
}

export function PageIntro({ eyebrow, title, lead, children }: { eyebrow?: string; title: string; lead?: string; children?: ReactNode }) {
  return (
    <section className="container-page pt-16 pb-10 md:pt-24 animate-rise">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="mt-3 max-w-3xl text-4xl md:text-6xl leading-[1.05]">{title}</h1>
      {lead && <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{lead}</p>}
      {children}
    </section>
  );
}

export const meta = (title: string, description: string) => ({
  meta: [
    { title }, { name: "description", content: description },
    { property: "og:title", content: title }, { property: "og:description", content: description },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ],
});
