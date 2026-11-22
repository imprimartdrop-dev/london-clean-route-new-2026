/**
 * GOODSPOTLESS — manual WhatsApp message builder.
 * This module NEVER sends a message. An authorised admin must check and press
 * Send in WhatsApp, then separately mark the enquiry as contacted.
 *
 * No customer data is stored here. Do not import CWX/business credentials.
 */
import { normalisePhone } from "../quote";

export type ReplyIntent = "received" | "accepted" | "ask" | "declined" | "quoted" | "booked";
export type CleaningReply = {
  name: string;
  reference: string;
  phone: string;
  service: string;
  postcode: string;
  homeType?: string;
  bedrooms?: number | undefined;
  bathrooms?: number | undefined;
  livingRooms?: number | undefined;
  kitchens?: number | undefined;
  sizeSqft?: number | null | undefined;
  frequency?: string;
  requestedDate?: string;
  timeWindow?: string;
  extras?: string[];
  notes?: string;
  intent: ReplyIntent;
  quotePence?: number;
  /** Booking must be confirmed by an authorised admin — never infer from preference. */
  confirmedDate?: string;
  confirmedTime?: string;
};

const SERVICES: Record<string, string> = {
  "regular-domestic-cleaning": "Regular domestic cleaning",
  "deep-cleaning": "One-off deep cleaning",
  "end-of-tenancy-cleaning": "End of tenancy cleaning",
  "short-let-changeovers": "Airbnb & short-let changeover",
  "office-cleaning": "Office cleaning",
  "after-builders-cleaning": "After builders cleaning",
};
const PROPERTIES: Record<string, string> = { flat: "Flat / apartment", house: "House", studio: "Studio", office: "Office / commercial", other: "Other" };
const FREQUENCIES: Record<string, string> = { once: "One-off", weekly: "Weekly", fortnightly: "Fortnightly", monthly: "Monthly", unsure: "To be discussed" };
const WINDOWS: Record<string, string> = { morning: "Morning (8am–12pm)", afternoon: "Afternoon (12pm–5pm)", evening: "Evening (5pm–8pm)", flexible: "Flexible" };
const EXTRAS: Record<string, string> = { oven: "Inside oven", fridge: "Inside fridge", windows: "Interior windows", carpets: "Carpet cleaning", linen: "Linen change", ironing: "Ironing" };
export const serviceLabel = (value: unknown) => SERVICES[String(value ?? "")] || String(value ?? "").replace(/-/g, " ");
export const propertyLabel = (value: unknown) => PROPERTIES[String(value ?? "")] || String(value ?? "");
export const frequencyLabel = (value: unknown) => FREQUENCIES[String(value ?? "")] || String(value ?? "");
export const timeLabel = (value: unknown) => WINDOWS[String(value ?? "")] || String(value ?? "");
export const extraLabel = (value: string) => EXTRAS[value] || value.replace(/-/g, " ");

export function formatUkDate(value: unknown): string {
  const raw = String(value ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return String(value ?? "");
  const date = new Date(`${raw}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) return raw;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

/** The original form stores room counts and extras alongside the customer's free-text notes. */
export function parseEnquiryNotes(raw: unknown) {
  let livingRooms: number | undefined;
  let kitchens: number | undefined;
  let extras: string[] = [];
  const description: string[] = [];
  for (const line of String(raw ?? "").split(/\r?\n/)) {
    const living = /^Living rooms:\s*(\d{1,2})\s*$/i.exec(line.trim());
    const kitchen = /^Kitchens:\s*(\d{1,2})\s*$/i.exec(line.trim());
    const extraLine = /^Requested extras:\s*(.*)$/i.exec(line.trim());
    if (living) livingRooms = Number(living[1]);
    else if (kitchen) kitchens = Number(kitchen[1]);
    else if (extraLine) extras = (extraLine[1] ?? "").split(",").map(v => v.trim()).filter(Boolean);
    else description.push(line);
  }
  return { livingRooms, kitchens, extras, description: description.join("\n").trim() };
}

const amount = (pence: number) => "£" + (pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function createCleaningReply(lead: CleaningReply): string {
  const name = lead.name.trim() || "there";
  const ref = lead.reference.trim();
  const postcode = lead.postcode.trim().toUpperCase();
  const rooms = [
    lead.bedrooms == null ? "" : `${lead.bedrooms} bedroom${lead.bedrooms === 1 ? "" : "s"}`,
    lead.bathrooms == null ? "" : `${lead.bathrooms} bathroom${lead.bathrooms === 1 ? "" : "s"}`,
    lead.livingRooms == null ? "" : `${lead.livingRooms} living room${lead.livingRooms === 1 ? "" : "s"}`,
    lead.kitchens == null ? "" : `${lead.kitchens} kitchen${lead.kitchens === 1 ? "" : "s"}`,
  ].filter(Boolean).join(", ");
  const summary = [
    `🧹 *Service:* ${serviceLabel(lead.service)}`,
    ...(lead.homeType ? [`🏠 *Property:* ${propertyLabel(lead.homeType)}${rooms ? " · " + rooms : ""}`] : rooms ? [`🏠 *Rooms:* ${rooms}`] : []),
    ...(lead.sizeSqft != null && lead.sizeSqft > 0 ? [`📐 *Approx. size:* ${lead.sizeSqft} sq ft`] : []),
    ...(lead.frequency ? [`🔁 *Frequency:* ${frequencyLabel(lead.frequency)}`] : []),
    ...(lead.extras?.length ? [`✨ *Extras requested:* ${lead.extras.map(extraLabel).join(", ")}`] : []),
    ...(lead.notes?.trim() ? [`📝 *Your notes:* ${lead.notes.trim()}`] : []),
    `📍 *Postcode:* ${postcode}`,
    ...(lead.requestedDate ? [`📅 *Preferred cleaning date:* ${formatUkDate(lead.requestedDate)}`] : []),
    ...(lead.timeWindow ? [`⏰ *Preferred time:* ${timeLabel(lead.timeWindow)}`] : []),
  ];
  const intro = [`Reference: ${ref}`, "", `Hello ${name},`, "", "Thank you for choosing GOODSPOTLESS.", "", ...summary];
  const tail = ["", "Kind regards,", "*GOODSPOTLESS*"];
  switch (lead.intent) {
    case "received":
      return ["*CLEANING REQUEST RECEIVED ✅*", "", ...intro, "", "*Next step:* We'll review the details and get in touch to discuss your cleaning requirements, availability and price. Your clean is not booked yet.", ...tail].join("\n");
    case "accepted":
      return ["*CLEANING REQUEST ACCEPTED ✅*", "", ...intro, "", "We've reviewed your enquiry and would be happy to discuss the next steps.", "", "*Next step:* We'll contact you to agree the scope of work, price and availability. No appointment is booked yet.", ...tail].join("\n");
    case "ask":
      return ["*A QUICK QUESTION 💬*", "", ...intro, "", "Could you tell us whether any areas need particular attention, and if there are any access arrangements we should know about? This will help us prepare an accurate quote.", ...tail].join("\n");
    case "declined":
      return ["*UPDATE ON YOUR CLEANING ENQUIRY*", "", ...intro, "", "Unfortunately, we're unable to take on this request at present. Thank you for considering us.", ...tail].join("\n");
    case "quoted":
      if (lead.quotePence === undefined || !Number.isSafeInteger(lead.quotePence) || lead.quotePence < 0) throw new Error("A valid quoted amount in pence is required.");
      return ["*YOUR CLEANING QUOTE 💷*", "", ...intro, "", "💷 *Proposed price:* " + amount(lead.quotePence), "", "This quote is subject to the agreed cleaning scope and availability. Nothing is booked until you confirm the price and appointment with us.", ...tail].join("\n");
    case "booked":
      if (!lead.confirmedDate || !lead.confirmedTime || !/^\d{4}-\d{2}-\d{2}$/.test(lead.confirmedDate) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(lead.confirmedTime)) {
        throw new Error("A valid administrator-confirmed date and time are required.");
      }
      return ["*CLEANING BOOKING CONFIRMED ✅*", "", ...intro, "", "📅 *Confirmed date:* " + formatUkDate(lead.confirmedDate), "🕒 *Confirmed time (UK):* " + lead.confirmedTime, "", "Please let us know about any access instructions or changes as soon as possible.", ...tail].join("\n");
  }
}

/** A direct WhatsApp link that opens a draft. It does not send a message. */
export function createWhatsAppDraftLink(lead: CleaningReply): string | null {
  const phone = normalisePhone(lead.phone);
  if (!phone) return null;
  const draft = createCleaningReply(lead);
  return "https://api.whatsapp.com/send?phone=" + phone.slice(1) + "&text=" + encodeURIComponent(draft);
}
