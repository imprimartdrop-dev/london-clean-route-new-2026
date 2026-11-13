import type { Localised } from "./i18n";

export type ServiceSlug = "regular-domestic-cleaning" | "deep-cleaning" | "end-of-tenancy-cleaning" | "short-let-changeovers" | "office-cleaning" | "after-builders-cleaning";

export interface Service {
  slug: ServiceSlug;
  name: Localised;
  short: Localised;
  intro: Localised;
  idealFor: Localised;
  included: Localised[];
  seoTitle: string;
  seoDescription: string;
}

const L = (en: string, pt: string): Localised => ({ en, pt });

export const SERVICES: Service[] = [
  {
    slug: "regular-domestic-cleaning",
    name: L("Regular Domestic Cleaning", "Limpeza Residencial Regular"),
    short: L("Weekly or fortnightly housekeeping", "Limpeza semanal ou quinzenal"),
    intro: L("A consistent cleaner, the same checklist every visit, and a home that stays on top of itself.", "A mesma profissional, o mesmo checklist a cada visita e uma casa sempre em ordem."),
    idealFor: L("Busy households, couples and families across North West London.", "Famílias e casais ocupados no Noroeste de Londres."),
    included: [L("Dusting and wiping of surfaces", "Tirar pó e limpar superfícies"), L("Kitchen worktops, hob and sink", "Bancadas, fogão e pia"), L("Bathrooms cleaned and descaled", "Banheiros limpos e sem calcário"), L("Hoovering and mopping floors", "Aspirar e passar pano no chão"), L("Bins emptied, beds made", "Lixo retirado e camas arrumadas")],
    seoTitle: "Regular Domestic Cleaning in North West London | London Clean Route",
    seoDescription: "Weekly and fortnightly home cleaning in NW London with a consistent cleaner and written checklist. Request a free, no-obligation quote.",
  },
  {
    slug: "deep-cleaning",
    name: L("One-Off Deep Cleaning", "Faxina Pesada Avulsa"),
    short: L("A thorough reset, top to bottom", "Uma limpeza completa, de cima a baixo"),
    intro: L("For spring cleans, before guests arrive or when a home simply needs a fresh start.", "Para faxinas de temporada, antes de visitas ou quando a casa precisa recomeçar."),
    idealFor: L("Homes that have not had a professional clean in a while.", "Casas que não recebem limpeza profissional há algum tempo."),
    included: [L("Skirting boards, doors and switches", "Rodapés, portas e interruptores"), L("Inside microwave and cupboards on request", "Interior do micro-ondas e armários, sob pedido"), L("Limescale and grout attention", "Atenção a calcário e rejunte"), L("High and low dusting", "Pó em áreas altas e baixas"), L("Oven clean as an add-on", "Limpeza de forno como adicional")],
    seoTitle: "One-Off Deep Cleaning in London | London Clean Route",
    seoDescription: "Thorough one-off deep cleans for London flats and houses, with optional oven cleaning. Tell us about your home for a tailored free quote.",
  },
  {
    slug: "end-of-tenancy-cleaning",
    name: L("End of Tenancy Cleaning", "Limpeza de Fim de Contrato"),
    short: L("Move-in and move-out cleans", "Limpeza de entrada e saída"),
    intro: L("A detailed clean planned around inventories and check-outs, for tenants, landlords and letting agents.", "Uma limpeza detalhada planejada em torno de vistorias, para inquilinos, proprietários e imobiliárias."),
    idealFor: L("Tenants moving out, landlords between lets and letting agents.", "Inquilinos de saída, proprietários entre contratos e imobiliárias."),
    included: [L("Kitchen appliances inside and out", "Eletrodomésticos por dentro e por fora"), L("Cupboards and drawers emptied and wiped", "Armários e gavetas limpos"), L("Bathrooms descaled", "Banheiros sem calcário"), L("Interior windows and sills", "Janelas internas e peitoris"), L("Floors hoovered and mopped throughout", "Pisos aspirados e lavados")],
    seoTitle: "End of Tenancy Cleaning in North West London | London Clean Route",
    seoDescription: "Move-out and move-in cleaning for tenants, landlords and letting agents in NW London, planned around inventory checks. Get a free quote.",
  },
  {
    slug: "short-let-changeovers",
    name: L("Airbnb & Short Let Changeovers", "Troca de Hóspedes (Airbnb)"),
    short: L("Guest-ready turnarounds", "Imóvel pronto para o próximo hóspede"),
    intro: L("Reliable turnarounds between guests, timed around check-out and check-in.", "Trocas confiáveis entre hóspedes, no horário entre check-out e check-in."),
    idealFor: L("Hosts and property managers running short lets.", "Anfitriões e gestores de imóveis de temporada."),
    included: [L("Linen change and bed presentation", "Troca de roupa de cama e arrumação"), L("Bathroom and kitchen reset", "Banheiro e cozinha prontos"), L("Consumables restock from your supplies", "Reposição com seus suprimentos"), L("Damage or issue notes for the host", "Registro de danos ou problemas"), L("Photo-ready finishing touches", "Toques finais prontos para foto")],
    seoTitle: "Airbnb & Short Let Cleaning in London | London Clean Route",
    seoDescription: "Short-let and Airbnb changeover cleaning in London with linen changes and restocks, scheduled around guest check-ins. Request a free quote.",
  },
  {
    slug: "office-cleaning",
    name: L("Office Cleaning", "Limpeza de Escritórios"),
    short: L("Small offices and studios", "Pequenos escritórios e estúdios"),
    intro: L("Discreet cleaning before or after hours, so your team arrives to a tidy workplace.", "Limpeza discreta antes ou depois do expediente, para sua equipe chegar a um ambiente organizado."),
    idealFor: L("Small offices, studios and clinics.", "Pequenos escritórios, estúdios e consultórios."),
    included: [L("Desks and touchpoints wiped", "Mesas e pontos de contato higienizados"), L("Kitchenette and washrooms", "Copa e banheiros"), L("Bins and recycling", "Lixo e reciclagem"), L("Floors hoovered and mopped", "Pisos aspirados e lavados"), L("Flexible early or evening slots", "Horários cedo ou à noite")],
    seoTitle: "Office Cleaning in North West London | London Clean Route",
    seoDescription: "Before- or after-hours cleaning for small offices and studios in North West London. Tell us about your workplace for a free quote.",
  },
  {
    slug: "after-builders-cleaning",
    name: L("After Builders Cleaning", "Limpeza Pós-Obra"),
    short: L("Post-renovation dust removal", "Remoção de poeira pós-reforma"),
    intro: L("Fine dust, paint flecks and residue removed so you can actually enjoy the renovation.", "Poeira fina, respingos de tinta e resíduos removidos para você aproveitar a reforma."),
    idealFor: L("Homeowners and contractors after refurbishment work.", "Proprietários e empreiteiros após reformas."),
    included: [L("Multi-pass dust removal", "Remoção de poeira em várias etapas"), L("Paint and sticker residue on glass", "Resíduos de tinta e adesivos em vidros"), L("Inside cupboards and fittings", "Interior de armários e acessórios"), L("Floors cleaned to finish", "Pisos limpos para entrega"), L("Final walk-through on request", "Vistoria final sob pedido")],
    seoTitle: "After Builders Cleaning in London | London Clean Route",
    seoDescription: "Post-renovation and after builders cleaning in London: fine dust, paint residue and fittings handled carefully. Request a free quote.",
  },
];

export const getService = (slug: string): Service | undefined => SERVICES.find((s) => s.slug === slug);

/** Initial target districts — indicative only; editable in one place. */
export const INITIAL_AREAS: { district: string; name: string }[] = [
  { district: "NW1", name: "Camden Town, Regent's Park" }, { district: "NW2", name: "Cricklewood, Willesden Green" },
  { district: "NW3", name: "Hampstead, Belsize Park" }, { district: "NW4", name: "Hendon" },
  { district: "NW5", name: "Kentish Town" }, { district: "NW6", name: "Kilburn, West Hampstead" },
  { district: "NW8", name: "St John's Wood" }, { district: "NW10", name: "Kensal Rise, Harlesden" },
  { district: "NW11", name: "Golders Green" }, { district: "W9", name: "Maida Vale" },
];

export const FAQS: { q: Localised; a: Localised }[] = [
  { q: L("How do you price a clean?", "Como vocês calculam o preço?"), a: L("We price each enquiry personally based on property size, service, frequency and any extras. You receive a clear quote before anything is booked.", "Cada pedido é orçado pessoalmente, considerando tamanho do imóvel, serviço, frequência e extras. Você recebe um preço claro antes de qualquer agendamento.") },
  { q: L("Do I need to be at home?", "Preciso estar em casa?"), a: L("No. Many clients arrange key collection or a lockbox. We agree access arrangements in writing beforehand.", "Não. Muitos clientes combinam entrega de chave ou cofre. Combinamos o acesso por escrito antes.") },
  { q: L("Do you bring cleaning products?", "Vocês levam produtos de limpeza?"), a: L("We can bring products and equipment, or use yours if you prefer specific products. Tell us in the quote form.", "Podemos levar produtos e equipamentos, ou usar os seus se preferir. Informe no formulário.") },
  { q: L("Which areas do you cover?", "Quais regiões vocês atendem?"), a: L("We are starting in North West London. Enter your postcode in the quote form and we will confirm honestly whether we can reach you.", "Começamos pelo Noroeste de Londres. Informe seu código postal no formulário e confirmaremos com sinceridade se conseguimos atender.") },
  { q: L("Can I change or cancel a booking?", "Posso alterar ou cancelar um agendamento?"), a: L("Yes. Our change and cancellation terms will be set out clearly in your quote before you confirm.", "Sim. As condições de alteração e cancelamento estarão claras no orçamento, antes da confirmação.") },
  { q: L("Do you clean offices outside working hours?", "Limpam escritórios fora do horário comercial?"), a: L("Yes, early-morning and evening slots are available for small offices, subject to route availability.", "Sim, há horários cedo e à noite para pequenos escritórios, conforme disponibilidade de rota.") },
];
