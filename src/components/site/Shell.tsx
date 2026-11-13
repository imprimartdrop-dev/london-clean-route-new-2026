import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useI18n, type DictKey } from "@/lib/i18n";

const NAV: { to: "/services" | "/how-it-works" | "/areas" | "/faqs" | "/contact"; k: DictKey }[] = [
  { to: "/services", k: "nav.services" }, { to: "/how-it-works", k: "nav.how" }, { to: "/areas", k: "nav.areas" }, { to: "/faqs", k: "nav.faqs" }, { to: "/contact", k: "nav.contact" },
];

export function LangToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <div role="group" aria-label={t("lang.label")} className="flex text-xs font-semibold tracking-wider">
      {(["en", "pt"] as const).map((l) => (
        <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l}
          className={`px-2 py-1 rounded ${lang === l ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          {l === "en" ? "UK" : "BR"}
        </button>
      ))}
    </div>
  );
}

export function Header() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="font-display text-xl tracking-tight">{t("brand")}</Link>
        <nav aria-label="Main" className="hidden lg:flex gap-7 text-sm">
          {NAV.map((n) => <Link key={n.to} to={n.to} className="text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground" }}>{t(n.k)}</Link>)}
        </nav>
        <div className="flex items-center gap-3">
          <LangToggle />
          <Button asChild size="sm"><Link to="/quote">{t("cta.quoteShort")}</Link></Button>
        </div>
      </div>
      <nav aria-label="Mobile" className="lg:hidden container-page flex gap-5 overflow-x-auto pb-3 text-sm">
        {NAV.map((n) => <Link key={n.to} to={n.to} className="whitespace-nowrap text-muted-foreground">{t(n.k)}</Link>)}
      </nav>
    </header>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="bg-ink text-ink-foreground mt-24">
      <div className="container-page grid gap-10 py-16 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-2xl">{t("brand")}</p>
          <p className="mt-3 max-w-sm text-sm opacity-75">{t("footer.tagline")}</p>
          <Button asChild variant="secondary" className="mt-6"><Link to="/quote">{t("cta.quote")}</Link></Button>
        </div>
        <div className="text-sm space-y-2"><p className="eyebrow !text-sage">{t("footer.company")}</p>
          {NAV.map((n) => <Link key={n.to} to={n.to} className="block opacity-80 hover:opacity-100">{t(n.k)}</Link>)}</div>
        <div className="text-sm space-y-2"><p className="eyebrow !text-sage">{t("footer.legal")}</p>
          <Link to="/privacy" className="block opacity-80 hover:opacity-100">{t("footer.privacy")}</Link>
          <Link to="/admin" className="block opacity-80 hover:opacity-100">{t("footer.admin")}</Link></div>
      </div>
      <p className="container-page pb-8 text-xs opacity-60">{t("footer.rights")}</p>
    </footer>
  );
}

export function CookieConsent() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  useEffect(() => { if (!localStorage.getItem("lcr-consent")) setShow(true); }, []);
  if (!show) return null;
  const save = (v: string) => { localStorage.setItem("lcr-consent", v); setShow(false); };
  return (
    <div role="dialog" aria-label="Cookies" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-lg border bg-card p-5 shadow-soft">
      <p className="text-sm">{t("cookie.text")} <Link to="/privacy" className="underline">{t("cookie.more")}</Link></p>
      <div className="mt-4 flex gap-2"><Button size="sm" onClick={() => save("all")}>{t("cookie.accept")}</Button><Button size="sm" variant="quiet" onClick={() => save("essential")}>{t("cookie.reject")}</Button></div>
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
