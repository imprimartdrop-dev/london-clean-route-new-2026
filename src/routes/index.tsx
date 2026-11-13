import { createFileRoute } from "@tanstack/react-router";
import { useId, useState, type PointerEvent } from "react";
import { ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, ClipboardCheck, Clock3, Home as HomeIcon, MapPin, ShieldCheck, Sparkles, MoveHorizontal } from "lucide-react";
import kitchenPhoto from "../assets/kitchen-detail.jpg";
import livingPhoto from "../assets/hero-living-room.jpg";
import bedroomPhoto from "../assets/bedroom-shortlet.jpg";
import { useI18n, pick, type DictKey } from "../lib/i18n";
import { FAQS, INITIAL_AREAS, SERVICES } from "../lib/content";
import { quoteSchema, STEP_SCHEMAS, normalisePostcode, validatePhotos } from "../lib/quote";
import { enquiryService } from "../lib/backend/enquiry-service";
import type { QuoteInput } from "../lib/quote";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "London Clean Route | Professional Cleaning Services in North West London" },
      { name: "description", content: "Thoughtful home cleaning, end of tenancy, deep cleans and Airbnb changeovers in North West London. Explore our services and request a free, no-obligation quote." },
      { property: "og:title", content: "London Clean Route — Cleaning, thoughtfully done" },
      { property: "og:description", content: "Professional cleaning for London homes, tenants and businesses." },
    ],
  }),
  component: HomePage,
});

function BeforeAfter() {
  const { lang } = useI18n();
  const [split, setSplit] = useState(50);
  const id = useId();
  const update = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width > 0) setSplit(Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)));
  };
  return (
    <div className="lcr-compare" onPointerDown={(event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      update(event);
    }} onPointerMove={(event) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) update(event);
    }} onPointerUp={(event) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }}>
      <div className="lcr-compare__after">
        <img src={kitchenPhoto} alt={lang === "en" ? "Bright, clean contemporary kitchen" : "Cozinha contemporânea, clara e limpa"} draggable={false} />
      </div>
      <div className="lcr-compare__before" style={{ clipPath: "inset(0 " + (100 - split) + "% 0 0)" }}>
        <img src={kitchenPhoto} alt="" draggable={false} />
        <div className="lcr-compare__before-tint" aria-hidden="true" />
      </div>
      <span className="lcr-compare__tag lcr-compare__tag--before">{lang === "en" ? "BEFORE" : "ANTES"}</span>
      <span className="lcr-compare__tag lcr-compare__tag--after">{lang === "en" ? "AFTER" : "DEPOIS"}</span>
      <div className="lcr-compare__bar" style={{ left: split + "%" }} aria-hidden="true">
        <span className="lcr-compare__handle"><MoveHorizontal size={24}/></span>
      </div>
      <input id={id} type="range" min="0" max="100" value={split}
        aria-label={lang === "en" ? "Slide to compare an illustrative room appearance" : "Arraste para comparar a aparência ilustrativa do ambiente"}
        className="lcr-compare__range" onChange={(event) => setSplit(Number(event.target.value))} />
    </div>
  );
}

type Draft = Omit<QuoteInput, "privacyAccepted"> & { privacyAccepted: boolean };
const INITIAL: Draft = {
  service: "regular-domestic-cleaning", homeType: "flat", bedrooms: 2, bathrooms: 1, sizeSqft: "",
  frequency: "once", postcode: "", date: "", timeWindow: "flexible", notes: "",
  name: "", phone: "", email: "", privacyAccepted: false, marketingOptIn: false, company: "",
};
const EXTRAS = [
  { id: "oven", en: "Inside oven", pt: "Interior do forno" },
  { id: "fridge", en: "Inside fridge", pt: "Interior da geladeira" },
  { id: "windows", en: "Interior windows", pt: "Janelas internas" },
  { id: "carpets", en: "Carpet cleaning", pt: "Limpeza de carpetes" },
  { id: "linen", en: "Linen change", pt: "Troca de roupa de cama" },
  { id: "ironing", en: "Ironing", pt: "Passar roupas" },
];

function QuoteWizard() {
  const { lang, t } = useI18n();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(INITIAL);
  const [extras, setExtras] = useState<string[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const [reference, setReference] = useState("");
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const change = <K extends keyof Draft>(field: K, value: Draft[K]) => {
    setDraft(prev => ({ ...prev, [field]: value }));
    setError("");
  };
  const chooseExtra = (value: string) => setExtras(prev => prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]);
  const next = () => {
    const result = STEP_SCHEMAS[step - 1].safeParse(draft);
    if (!result.success) {
      const key = result.error.issues[0]?.message as DictKey;
      setError(key?.startsWith("err.") ? t(key) : t("err.required"));
      return;
    }
    setError("");
    if (step === 4) { setReview(true); return; }
    setStep(prev => prev + 1);
  };
  const submit = async () => {
    if (busy) return;
    const notes = [draft.notes, extras.length ? "Requested extras: " + extras.join(", ") : ""].filter(Boolean).join("\n");
    const input = { ...draft, notes };
    const validation = quoteSchema.safeParse(input);
    if (!validation.success) { setError(t("q.error")); return; }
    const photoError = validatePhotos(photos);
    if (photoError) { setError(t(photoError)); return; }
    setBusy(true); setError("");
    try {
      const result = await enquiryService.submitEnquiry(validation.data, { startedAt, photos });
      if (result.mode === "preview") setReference(result.reference);
      else setError(t("q.error"));
    } catch { setError(t("q.error")); }
    finally { setBusy(false); }
  };
  const inputClass = "lcr-field";
  const serviceChosen = SERVICES.find(s => s.slug === draft.service);
  if (reference) return (
    <div className="lcr-quote-success" role="status">
      <div className="lcr-success-mark"><Check size={30}/></div>
      <p className="eyebrow">{lang === "en" ? "DEMONSTRATION COMPLETE" : "DEMONSTRAÇÃO CONCLUÍDA"}</p>
      <h3 className="mt-4 text-3xl md:text-4xl">{t("q.previewDoneTitle")}</h3>
      <p className="mt-4 text-muted-foreground max-w-xl mx-auto">{t("q.previewDoneText")}</p>
      <p className="mt-5 text-xl font-semibold">{reference}</p>
      <button type="button" className="lcr-button mt-7" onClick={() => {setReference("");setDraft(INITIAL);setExtras([]);setPhotos([]);setStep(1);setReview(false);setStartedAt(Date.now());}}>
        {t("q.again")} <ArrowRight size={18}/>
      </button>
    </div>
  );
  return (
    <div className="lcr-quote-layout">
      <div className="lcr-quote-intro">
        <p className="eyebrow">{lang === "en" ? "YOUR CLEANING, YOUR WAY" : "A LIMPEZA DO SEU JEITO"}</p>
        <h2>{lang === "en" ? "Tell us about your space." : "Conte-nos sobre seu espaço."}</h2>
        <p className="mt-5 text-muted-foreground">{lang === "en" ? "A few simple details are all we need to prepare a thoughtful, tailored quote." : "Com alguns detalhes, podemos preparar um orçamento personalizado para você."}</p>
        <div className="lcr-quote-asides">
          <div><ShieldCheck size={20}/><span>{lang === "en" ? "No obligation to book" : "Sem compromisso de contratar"}</span></div>
          <div><Clock3 size={20}/><span>{lang === "en" ? "Around two minutes" : "Cerca de dois minutos"}</span></div>
          <div><ClipboardCheck size={20}/><span>{lang === "en" ? "Personalised quote" : "Orçamento personalizado"}</span></div>
        </div>
      </div>
      <div className="lcr-quote-card">
        <div className="lcr-preview-warning" role="status">
          <ShieldCheck size={16} aria-hidden="true"/>
          <span>{lang === "en" ? "Preview mode: forms are not connected or delivered yet." : "Modo prévia: os formulários ainda não enviam nem armazenam pedidos."}</span>
        </div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="eyebrow !text-[11px]">{t("q.step")} {step} {t("q.of")} 4</p>
          <span className="text-xs text-muted-foreground">{Math.round(step / 4 * 100)}%</span>
        </div>
        <div className="lcr-progress" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={4} aria-label={t("q.step")}>
          <span style={{ width: step * 25 + "%" }}/>
        </div>
        {!review ? <>
          <h3 className="mt-7 mb-5 text-2xl md:text-3xl">{t(("q.s" + step) as DictKey)}</h3>
          {step === 1 && <div className="space-y-5">
            <fieldset><legend className="lcr-label">{t("q.service")}</legend>
              <div className="grid grid-cols-2 gap-2">
                {SERVICES.map(s => <button type="button" key={s.slug} aria-pressed={draft.service === s.slug} className={"lcr-choice" + (draft.service === s.slug ? " lcr-choice--selected" : "")} onClick={() => change("service", s.slug)}>
                  <span>{pick(s.name, lang)}</span><small>{pick(s.short, lang)}</small>
                </button>)}
              </div>
            </fieldset>
            <label className="block"><span className="lcr-label">{t("q.homeType")}</span>
              <select className={inputClass} value={draft.homeType} onChange={e => change("homeType", e.target.value as Draft["homeType"])}>
                {(["flat","house","studio","office","other"] as const).map(k=><option key={k} value={k}>{t(("q.home." + k) as DictKey)}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="lcr-label">{t("q.bedrooms")}</span><select className={inputClass} value={draft.bedrooms} onChange={e=>change("bedrooms", Number(e.target.value))}>{Array.from({length:11}, (_,i)=><option key={i}>{i}</option>)}</select></label>
              <label><span className="lcr-label">{t("q.bathrooms")}</span><select className={inputClass} value={draft.bathrooms} onChange={e=>change("bathrooms", Number(e.target.value))}>{Array.from({length:11}, (_,i)=><option key={i}>{i}</option>)}</select></label>
            </div>
            <label className="block"><span className="lcr-label">{t("q.size")}</span><input className={inputClass} value={draft.sizeSqft} onChange={e=>change("sizeSqft",e.target.value)} inputMode="numeric" placeholder="e.g. 900"/></label>
          </div>}
          {step === 2 && <div className="space-y-4">
            <label className="block"><span className="lcr-label">{t("q.frequency")}</span>
              <select className={inputClass} value={draft.frequency} onChange={e=>change("frequency",e.target.value as Draft["frequency"])}>
                {(["once","weekly","fortnightly","monthly","unsure"] as const).map(k=><option key={k} value={k}>{t(("q.freq." + k) as DictKey)}</option>)}
              </select>
            </label>
            <label className="block"><span className="lcr-label">{t("q.postcode")}</span><input autoComplete="postal-code" className={inputClass} value={draft.postcode} onChange={e=>change("postcode",e.target.value)} onBlur={()=>change("postcode",normalisePostcode(draft.postcode))} placeholder="NW10 5NH"/></label>
            <label className="block"><span className="lcr-label">{t("q.date")}</span><input className={inputClass} type="date" min={new Date().toISOString().slice(0,10)} value={draft.date} onChange={e=>change("date",e.target.value)}/></label>
            <label className="block"><span className="lcr-label">{t("q.window")}</span>
              <select className={inputClass} value={draft.timeWindow} onChange={e=>change("timeWindow",e.target.value as Draft["timeWindow"])}>
                {(["morning","afternoon","evening","flexible"] as const).map(k=><option key={k} value={k}>{t(("q.win." + k) as DictKey)}</option>)}
              </select>
            </label>
            <p className="text-xs text-muted-foreground">{lang==="en"?"Preferred dates are not confirmed bookings. We will check your area and availability.":"Datas preferidas não significam reserva confirmada. Verificaremos a região e a disponibilidade."}</p>
          </div>}
          {step === 3 && <div className="space-y-5">
            <fieldset><legend className="lcr-label">{lang === "en" ? "Would you like anything extra?" : "Precisa de algum serviço adicional?"}</legend>
              <div className="grid grid-cols-2 gap-2">{EXTRAS.map(e=><button key={e.id} type="button" aria-pressed={extras.includes(e.id)} className={"lcr-extra"+(extras.includes(e.id)?" lcr-extra--selected":"")} onClick={()=>chooseExtra(e.id)}>
                <span className="lcr-extra__tick">{extras.includes(e.id) && <Check size={13}/>}</span>{lang==="en"?e.en:e.pt}
              </button>)}</div>
            </fieldset>
            <label className="block"><span className="lcr-label">{t("q.notes")}</span>
              <textarea className={inputClass+" min-h-28"} rows={4} maxLength={1000} placeholder={t("q.notesPh")} value={draft.notes ?? ""} onChange={e=>change("notes",e.target.value)}/>
            </label>
            <label className="block"><span className="lcr-label">{t("q.photos")}</span>
              <input className={inputClass} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={e=>{
                const files = Array.from(e.currentTarget.files||[]);
                const issue = validatePhotos(files);
                if (issue) {setError(t(issue));setPhotos([]);} else {setError("");setPhotos(files);}
              }}/>
              <span className="block mt-2 text-xs text-muted-foreground">{t("q.photosHint")}</span>
            </label>
          </div>}
          {step === 4 && <div className="space-y-4">
            <label className="block"><span className="lcr-label">{t("q.name")}</span><input className={inputClass} autoComplete="name" value={draft.name} onChange={e=>change("name",e.target.value)}/></label>
            <label className="block"><span className="lcr-label">{t("q.phone")}</span><input className={inputClass} autoComplete="tel" type="tel" placeholder="+44 7..." value={draft.phone} onChange={e=>change("phone",e.target.value)}/><span className="block text-xs text-muted-foreground mt-1">{t("q.phoneHint")}</span></label>
            <label className="block"><span className="lcr-label">{t("q.email")}</span><input className={inputClass} autoComplete="email" type="email" value={draft.email} onChange={e=>change("email",e.target.value)}/></label>
            <label className="lcr-check"><input type="checkbox" checked={draft.privacyAccepted} onChange={e=>change("privacyAccepted",e.target.checked)}/><span>{t("q.privacy")}</span></label>
            <label className="lcr-check"><input type="checkbox" checked={draft.marketingOptIn} onChange={e=>change("marketingOptIn",e.target.checked)}/><span>{t("q.marketing")}</span></label>
            <input tabIndex={-1} aria-hidden="true" autoComplete="off" value={draft.company||""} onChange={e=>change("company",e.target.value)} className="absolute opacity-0 pointer-events-none h-px w-px" />
          </div>}
        </> : <>
          <h3 className="mt-7 mb-4 text-2xl md:text-3xl">{t("q.review")}</h3>
          <div className="lcr-review">
            <div><span>{t("q.service")}</span><strong>{serviceChosen?pick(serviceChosen.name,lang):"—"}</strong></div>
            <div><span>{t("q.homeType")}</span><strong>{t(("q.home."+draft.homeType) as DictKey)} · {draft.bedrooms} {t("q.bedrooms").toLowerCase()}</strong></div>
            <div><span>{t("q.postcode")}</span><strong>{normalisePostcode(draft.postcode)}</strong></div>
            <div><span>{t("q.date")}</span><strong>{draft.date}</strong></div>
            <div><span>{t("q.name")}</span><strong>{draft.name}</strong></div>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">{t("q.pendingText")}</p>
        </>}
        {error && <p className="mt-5 rounded-md bg-red-50 text-red-800 px-4 py-3 text-sm" role="alert">{error}</p>}
        <div className="mt-7 flex gap-3 items-center justify-between">
          <button type="button" disabled={step===1&&!review} onClick={()=>{setError("");if(review)setReview(false);else setStep(s=>Math.max(1,s-1));}} className="lcr-button-back"><ChevronLeft size={17}/>{t("q.back")}</button>
          <button type="button" disabled={busy} className="lcr-button" onClick={review?submit:next}>
            {busy ? t("q.submitting") : review ? t("q.submit") : step===4 ? t("q.review") : t("q.next")}
            {!busy && <ArrowRight size={18}/>}
          </button>
        </div>
      </div>
    </div>
  );
}

function HomePage() {
  const { lang, t } = useI18n();
  return (
    <>
      <section className="lcr-hero">
        <div className="lcr-hero__image" style={{ backgroundImage: "url(" + livingPhoto + ")" }} aria-hidden="true" />
        <div className="lcr-hero__shade" aria-hidden="true"/>
        <div className="container-page relative z-10 flex items-center min-h-[620px] py-24 md:py-32">
          <div className="max-w-[740px] animate-rise">
            <div className="lcr-hero__eyebrow"><span className="lcr-dot"/>{lang==="en"?"NORTH WEST LONDON · HOME & COMMERCIAL CLEANING":"NOROESTE DE LONDRES · LIMPEZA RESIDENCIAL E COMERCIAL"}</div>
            <h1 className="lcr-hero__title">{lang==="en"?"A cleaner home. A little more room to breathe.":"Sua casa limpa. Mais tempo para aproveitar."}</h1>
            <p className="lcr-hero__lead">{lang==="en"?"Thoughtfully delivered cleaning for London homes, workplaces and spaces between chapters. Because the details make all the difference.":"Limpeza feita com atenção para casas, escritórios e imóveis em Londres. Porque cada detalhe faz a diferença."}</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a className="lcr-button lcr-button--cream" href="#quote">{t("cta.quote")} <ArrowUpRight size={19}/></a>
              <a href="#services" className="lcr-hero__secondary">{lang==="en"?"Explore our services":"Conheça os serviços"} <ArrowRight size={17}/></a>
            </div>
          </div>
        </div>
        <div className="lcr-hero__foot"><span>{lang==="en"?"Care in every corner.":"Cuidado em cada detalhe."}</span><span>01 — 04</span></div>
      </section>

      <section className="lcr-intro-band">
        <div className="container-page grid gap-8 md:grid-cols-3">
          <div><ShieldCheck size={22}/><span>{lang==="en"?"Carefully considered service":"Atendimento cuidadoso"}</span></div>
          <div><Sparkles size={22}/><span>{lang==="en"?"A beautifully refreshed space":"Ambientes renovados"}</span></div>
          <div><MapPin size={22}/><span>{lang==="en"?"Starting in North West London":"Começando pelo noroeste de Londres"}</span></div>
        </div>
      </section>

      <section id="difference" className="lcr-section container-page">
        <div className="lcr-section-heading">
          <div><p className="eyebrow">{lang==="en"?"THE DIFFERENCE IS IN THE DETAIL":"A DIFERENÇA ESTÁ NOS DETALHES"}</p>
            <h2>{lang==="en"?"A space that feels like new.":"Um ambiente com cara de novo."}</h2>
          </div>
          <p>{lang==="en"?"Move the slider to see how a refreshed space can change the feeling of a room.":"Arraste o controle para visualizar a transformação de um ambiente renovado."}</p>
        </div>
        <BeforeAfter/>
        <p className="lcr-illustration-note">{lang==="en"?"Illustrative demonstration using one photograph with a visual filter. Not a before-and-after from a real client; original paired cleaning photographs will replace it before launch.":"Demonstração ilustrativa com filtro visual em uma fotografia. Não representa um serviço real; fotos originais de antes e depois serão incluídas antes do lançamento."}</p>
      </section>

      <section id="quote" className="lcr-quote-section">
        <div className="container-page"><QuoteWizard/></div>
      </section>

      <section id="services" className="lcr-section container-page">
        <div className="lcr-section-heading">
          <div><p className="eyebrow">{lang==="en"?"WHAT WE DO":"O QUE FAZEMOS"}</p><h2>{lang==="en"?"Every space deserves exceptional care.":"Cada espaço merece cuidado especial."}</h2></div>
          <p>{lang==="en"?"From regular visits to the deepest reset, choose a service that suits your home and your life.":"De visitas regulares à limpeza mais completa, escolha o serviço ideal para o seu espaço."}</p>
        </div>
        <div className="lcr-service-grid">
          {SERVICES.map((s,i)=><a href="#quote" className="lcr-service-card" key={s.slug}>
            <span className="lcr-service-number">0{i+1}</span>
            <div className="lcr-service-card__icon">{i===0?<HomeIcon size={28}/>:i===3?<Clock3 size={28}/>:<Sparkles size={28}/>}</div>
            <h3>{pick(s.name,lang)}</h3>
            <p>{pick(s.intro,lang)}</p>
            <span className="lcr-service-more">{lang==="en"?"Request a quote":"Pedir orçamento"} <ArrowUpRight size={17}/></span>
          </a>)}
        </div>
      </section>

      <section id="how" className="lcr-how">
        <div className="container-page grid lg:grid-cols-2 gap-10 lg:gap-20 items-center">
          <div className="lcr-how__image"><img src={bedroomPhoto} alt={lang==="en"?"Beautifully presented calm bedroom":"Quarto aconchegante bem organizado"} loading="lazy"/><span>{lang==="en"?"ROOM TO FEEL AT HOME":"UM LAR PARA APROVEITAR"}</span></div>
          <div><p className="eyebrow">{lang==="en"?"OUR APPROACH":"NOSSA FORMA DE TRABALHAR"}</p>
            <h2 className="mt-4 text-4xl md:text-5xl">{lang==="en"?"Simple from the first hello.":"Simples desde o primeiro contato."}</h2>
            <p className="mt-5 text-muted-foreground">{lang==="en"?"No complicated process. Just a thoughtful service, tailored to your property.":"Sem complicação. Um serviço cuidadoso e adaptado ao seu imóvel."}</p>
            <div className="mt-9 space-y-6">
              {([1,2,3,4] as const).map(n=><div className="lcr-how-step" key={n}>
                <span>0{n}</span><div><h3>{t(("how."+n) as DictKey)}</h3><p>{t(("how."+n+"t") as DictKey)}</p></div>
              </div>)}
            </div>
            <a href="#quote" className="lcr-text-link mt-9 inline-flex">{t("cta.quote")} <ArrowRight size={18}/></a>
          </div>
        </div>
      </section>

      <section id="areas" className="lcr-section container-page">
        <div className="lcr-section-heading"><div><p className="eyebrow">{lang==="en"?"LOCAL BY DESIGN":"ATENDIMENTO POR REGIÃO"}</p><h2>{t("home.areasTitle")}</h2></div><p>{t("home.areasLead")}</p></div>
        <div className="lcr-areas">{INITIAL_AREAS.map(a=><span key={a.district}><MapPin size={15}/><b>{a.district}</b> {a.name}</span>)}</div>
        <p className="text-sm text-muted-foreground mt-5">{t("areas.disclaimer")}</p>
      </section>

      <section id="faqs" className="lcr-faq">
        <div className="container-page grid md:grid-cols-[0.85fr_1.15fr] gap-12">
          <div><p className="eyebrow">{lang==="en"?"GOOD TO KNOW":"BOM SABER"}</p><h2 className="mt-4 text-4xl md:text-5xl">{t("faqs.title")}</h2><p className="mt-5 text-muted-foreground">{lang==="en"?"A few answers before we get started.":"Algumas respostas antes de começar."}</p></div>
          <div>{FAQS.map((faq,i)=><details key={i} className="lcr-faq-item"><summary>{pick(faq.q,lang)}<span>+</span></summary><p>{pick(faq.a,lang)}</p></details>)}</div>
        </div>
      </section>

      <section id="contact" className="lcr-bottom-cta">
        <div className="container-page text-center">
          <p className="eyebrow !text-[var(--color-sage)]">{lang==="en"?"A FRESH START":"UM NOVO COMEÇO"}</p>
          <h2 className="mt-5">{lang==="en"?"Let the space feel like yours again.":"Deixe seu espaço renovado de novo."}</h2>
          <p className="mt-5 text-white/70">{lang==="en"?"Tell us what you need. We’ll take care of the details.":"Conte o que você precisa. Nós cuidamos dos detalhes."}</p>
          <a href="#quote" className="lcr-button lcr-button--cream mt-8">{t("cta.quote")} <ArrowRight size={18}/></a>
        </div>
      </section>
    </>
  );
}
