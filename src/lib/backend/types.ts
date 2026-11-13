/**
 * Integration contract for a FUTURE, brand-new, separate backend project.
 * Mirrors docs/supabase-schema.sql. Nothing here is connected yet.
 */
import type { QuoteInput } from "../quote";

export type EnquiryStatus = "new" | "in_review" | "quoted" | "booked" | "completed" | "declined";
export const ENQUIRY_STATUSES: EnquiryStatus[] = ["new", "in_review", "quoted", "booked", "completed", "declined"];

export interface Enquiry {
  id: string;
  reference: string; // LCR-0001
  status: EnquiryStatus;
  service: QuoteInput["service"];
  homeType: QuoteInput["homeType"];
  bedrooms: number;
  bathrooms: number;
  sizeSqft: number | null;
  frequency: QuoteInput["frequency"];
  postcode: string;
  outwardCode: string;
  preferredDate: string;
  timeWindow: QuoteInput["timeWindow"];
  notes: string | null;
  name: string;
  phoneE164: string;
  email: string;
  marketingOptIn: boolean;
  quotePricePence: number | null;
  createdAt: string;
}

export type QuoteEventType = "created" | "status_changed" | "quote_set" | "note" | "telegram_notified" | "whatsapp_opened";
export interface QuoteEvent { id: string; enquiryId: string; type: QuoteEventType; actor: "system" | "admin" | "telegram"; payload: Record<string, unknown>; createdAt: string; }

export type SubmitResult =
  | { mode: "preview"; reference: string; delivered: false }
  | { mode: "live"; reference: string; delivered: true }
  | { mode: "error"; code: "validation" | "rate_limited" | "unavailable" };

/** Every implementation must run sensitive work server-side (createServerFn). */
export interface EnquiryService {
  readonly mode: "preview" | "live";
  submitEnquiry(input: QuoteInput, meta: { startedAt: number; photos: File[] }): Promise<SubmitResult>;
}
