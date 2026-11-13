/**
 * Quote form domain: schema, validation and helpers. Pure functions only —
 * shared by the client form today and a server function tomorrow.
 */
import { z } from "zod";
import type { DictKey } from "./i18n";
import type { ServiceSlug } from "./content";

export const SERVICE_SLUGS = ["regular-domestic-cleaning", "deep-cleaning", "end-of-tenancy-cleaning", "short-let-changeovers", "office-cleaning", "after-builders-cleaning"] as const satisfies readonly ServiceSlug[];
export const HOME_TYPES = ["flat", "house", "studio", "office", "other"] as const;
export const FREQUENCIES = ["once", "weekly", "fortnightly", "monthly", "unsure"] as const;
export const TIME_WINDOWS = ["morning", "afternoon", "evening", "flexible"] as const;

/** Full UK postcode (incl. GIR 0AA), case/space-insensitive. */
const UK_POSTCODE = /^(GIR ?0AA|[A-PR-UWYZ][A-HK-Y]?\d[A-Z\d]? ?\d[ABD-HJLNP-UW-Z]{2})$/i;

export function normalisePostcode(raw: string): string {
  const c = raw.replace(/\s+/g, "").toUpperCase();
  return c.length > 3 ? `${c.slice(0, -3)} ${c.slice(-3)}` : c;
}
export const isValidUkPostcode = (raw: string) => UK_POSTCODE.test(normalisePostcode(raw));
/** Outward code, e.g. "NW6" from "nw6 2ab". */
export const outwardCode = (raw: string) => normalisePostcode(raw).split(" ")[0] ?? "";

/** Accepts UK mobiles/landlines (07…, 020…, +44…) and E.164-style international numbers. */
export function normalisePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s().-]/g, "").replace(/^\+440/, "+44");
  if (/^00\d+$/.test(cleaned)) return normalisePhone("+" + cleaned.slice(2));
  if (/^0\d{9,10}$/.test(cleaned)) return "+44" + cleaned.slice(1);
  if (/^\+44\d{9,10}$/.test(cleaned)) return cleaned;
  if (/^\+[1-9]\d{6,14}$/.test(cleaned)) return cleaned;
  return null;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Error messages are i18n keys, translated at render time.
const req = "err.required" satisfies DictKey;

export const step1Schema = z.object({
  service: z.enum(SERVICE_SLUGS, { errorMap: () => ({ message: req }) }),
  homeType: z.enum(HOME_TYPES, { errorMap: () => ({ message: req }) }),
  bedrooms: z.coerce.number().int().min(0).max(10),
  bathrooms: z.coerce.number().int().min(0).max(10),
  sizeSqft: z.string().trim().max(6, "err.tooLong").regex(/^\d*$/, "err.required").optional().or(z.literal("")),
});
export const step2Schema = z.object({
  frequency: z.enum(FREQUENCIES, { errorMap: () => ({ message: req }) }),
  postcode: z.string().trim().min(1, req).refine(isValidUkPostcode, "err.postcode"),
  date: z.string().min(1, req).refine((d) => d >= todayIso(), "err.date"),
  timeWindow: z.enum(TIME_WINDOWS, { errorMap: () => ({ message: req }) }),
});
export const step3Schema = z.object({ notes: z.string().trim().max(1000, "err.tooLong").optional().or(z.literal("")) });
export const step4Schema = z.object({
  name: z.string().trim().min(2, "err.name").max(100, "err.tooLong"),
  phone: z.string().trim().min(1, req).refine((p) => normalisePhone(p) !== null, "err.phone"),
  email: z.string().trim().min(1, req).email("err.email").max(255, "err.tooLong"),
  privacyAccepted: z.literal(true, { errorMap: () => ({ message: "err.privacy" }) }),
  marketingOptIn: z.boolean(),
  /** Honeypot: must stay empty. */
  company: z.string().max(0).optional().or(z.literal("")),
});

export const quoteSchema = step1Schema.merge(step2Schema).merge(step3Schema).merge(step4Schema);
export type QuoteInput = z.infer<typeof quoteSchema>;
export const STEP_SCHEMAS = [step1Schema, step2Schema, step3Schema, step4Schema] as const;

export const PHOTO_LIMITS = { maxCount: 5, maxBytes: 8 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] };
export function validatePhotos(files: { type: string; size: number }[]): DictKey | null {
  if (files.length > PHOTO_LIMITS.maxCount) return "err.photoCount";
  if (files.some((f) => !PHOTO_LIMITS.types.includes(f.type))) return "err.photoType";
  if (files.some((f) => f.size > PHOTO_LIMITS.maxBytes)) return "err.photoSize";
  return null;
}

/** "LCR-0001" style reference from a sequence number. */
export const formatReference = (seq: number) => `LCR-${String(Math.max(1, Math.floor(seq))).padStart(4, "0")}`;

/** Abuse-prevention hook: minimum human fill time + honeypot. Server must re-check. */
export const MIN_FILL_MS = 4000;
export function looksAutomated(startedAt: number, now: number, honeypot: string | undefined): boolean {
  return now - startedAt < MIN_FILL_MS || Boolean(honeypot && honeypot.length > 0);
}
