/**
 * London Clean Route — manual WhatsApp message builder.
 * This module NEVER sends a message. An authorised admin must check and press
 * Send in WhatsApp, then separately mark the enquiry as contacted.
 *
 * No customer data is stored here. Do not import CWX/business credentials.
 */
import { normalisePhone } from "../quote";

export type ReplyIntent = "accepted" | "ask" | "declined" | "quoted" | "booked";
export type CleaningReply = {
  name: string;
  reference: string;
  phone: string;
  service: string;
  postcode: string;
  requestedDate?: string;
  notes?: string;
  intent: ReplyIntent;
  quotePence?: number;
  /** Booking must be confirmed by an authorised admin — never infer from preference. */
  confirmedDate?: string;
  confirmedTime?: string;
};

const amount = (pence: number) => "£" + (pence / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function createCleaningReply(lead: CleaningReply): string {
  const name = lead.name.trim() || "there";
  const ref = lead.reference.trim();
  const service = lead.service.trim();
  const postcode = lead.postcode.trim().toUpperCase();
  const intro = ["Hello " + name + ",", "", "Thank you for getting in touch with London Clean Route.", "", "🧹 *Service:* " + service, "📍 *Postcode:* " + postcode, "🔖 *Reference:* " + ref];
  const tail = ["", "Kind regards,", "*London Clean Route*"];
  switch (lead.intent) {
    case "accepted":
      return ["*YOUR CLEANING ENQUIRY ✅*", "", ...intro, "", "We've received and reviewed your request. We'll confirm availability and next steps with you shortly. No appointment is booked yet.", ...tail].join("\n");
    case "ask":
      return ["*A QUICK QUESTION 💬*", "", ...intro, "", "Could you share a little more about the cleaning required, any areas needing extra attention, and access arrangements? This will help us prepare an accurate quote.", ...tail].join("\n");
    case "declined":
      return ["*UPDATE ON YOUR CLEANING ENQUIRY*", "", ...intro, "", "Unfortunately, we're unable to take on this request at present. Thank you for considering us.", ...tail].join("\n");
    case "quoted":
      if (lead.quotePence === undefined || !Number.isSafeInteger(lead.quotePence) || lead.quotePence < 0) throw new Error("A valid quoted amount in pence is required.");
      return ["*YOUR CLEANING QUOTE 💷*", "", ...intro, "", "💷 *Proposed price:* " + amount(lead.quotePence), "", "This quote is subject to the agreed cleaning scope and availability. Nothing is booked until you confirm the price and appointment with us.", ...tail].join("\n");
    case "booked":
      if (!lead.confirmedDate || !lead.confirmedTime || !/^\d{4}-\d{2}-\d{2}$/.test(lead.confirmedDate) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(lead.confirmedTime)) {
        throw new Error("A valid administrator-confirmed date and time are required.");
      }
      return ["*CLEANING BOOKING CONFIRMED ✅*", "", ...intro, "", "📅 *Confirmed date:* " + lead.confirmedDate, "🕒 *Confirmed time (UK):* " + lead.confirmedTime, "", "Please let us know about any access instructions or changes as soon as possible.", ...tail].join("\n");
  }
}

/** A direct WhatsApp link that opens a draft. It does not send a message. */
export function createWhatsAppDraftLink(lead: CleaningReply): string | null {
  const phone = normalisePhone(lead.phone);
  if (!phone) return null;
  const draft = createCleaningReply(lead);
  return "https://api.whatsapp.com/send?phone=" + phone.slice(1) + "&text=" + encodeURIComponent(draft);
}
