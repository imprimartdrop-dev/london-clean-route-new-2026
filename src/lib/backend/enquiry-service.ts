/**
 * GOODSPOTLESS — preview stays active in Lovable. External hosting may switch
 * to live ONLY after endpoint, verified Turnstile keys and production checks.
 * No service-role key, Telegram token or customer database key belongs here.
 */
import { formatReference, looksAutomated, quoteSchema } from "../quote";
import type { EnquiryService, SubmitResult } from "./types";

const GOODSPOTLESS_ENDPOINT =
  "https://hrypzfgvjlniuhnglmzm.supabase.co/functions/v1/submit-cleaning-enquiry";
// Public site key, not the server-side Turnstile secret.
export const TURNSTILE_SITE_KEY =
  (import.meta.env.VITE_GOODSPOTLESS_TURNSTILE_SITE_KEY || "0x4AAAAAAGL0m2CEgbvz-Leb").trim();
// Production build uses the real endpoint. Development remains a preview.
// Server independently enforces the allowed origin and verifies Turnstile.
const liveConfigured = import.meta.env.PROD && TURNSTILE_SITE_KEY.length > 0;

let previewSeq = 0;

const previewAdapter: EnquiryService = {
  mode: "preview",
  async submitEnquiry(input, meta): Promise<SubmitResult> {
    if (typeof window !== "undefined" && ["goodspotless.uk", "www.goodspotless.uk"].includes(window.location.hostname)) return { mode: "error", code: "configuration" };
    if (!quoteSchema.safeParse(input).success) return { mode: "error", code: "validation" };
    if (looksAutomated(meta.startedAt, Date.now(), input.company)) return { mode: "error", code: "rate_limited" };
    await new Promise((r) => setTimeout(r, 700));
    previewSeq += 1;
    return { mode: "preview", reference: formatReference(previewSeq), delivered: false };
  },
};

const liveAdapter: EnquiryService = {
  mode: "live",
  async submitEnquiry(input, meta): Promise<SubmitResult> {
    if (!quoteSchema.safeParse(input).success) return { mode: "error", code: "validation" };
    if (looksAutomated(meta.startedAt, Date.now(), input.company)) return { mode: "error", code: "rate_limited" };
    // The photos endpoint is not ready. Never silently discard customer attachments.
    if (meta.photos.length) return { mode: "error", code: "validation" };
    if (!meta.captchaToken) return { mode: "error", code: "security" };

    try {
      const response = await fetch(GOODSPOTLESS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, captchaToken: meta.captchaToken }),
      });
      if (response.status === 429) return { mode: "error", code: "rate_limited" };
      if (response.status === 403) return { mode: "error", code: "security" };
      if (response.status === 400 || response.status === 422 || response.status === 413) return { mode: "error", code: "validation" };
      if (!response.ok) return { mode: "error", code: "unavailable" };
      const data: unknown = await response.json();
      if (typeof data === "object" && data !== null && "stored" in data &&
          data.stored === true && "reference" in data &&
          typeof data.reference === "string" && data.reference.length <= 25) {
        return { mode: "live", reference: data.reference, delivered: true };
      }
      return { mode: "error", code: "unavailable" };
    } catch {
      return { mode: "error", code: "network" };
    }
  },
};

export const enquiryService: EnquiryService =
  liveConfigured ? liveAdapter : previewAdapter;
export const INTEGRATION_PENDING = !liveConfigured;
