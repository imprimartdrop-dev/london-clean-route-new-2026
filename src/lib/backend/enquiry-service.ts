/**
 * Service locator. Today only the preview adapter exists: it validates locally,
 * stores NOTHING and sends NOTHING. Swap in a server-function-backed adapter
 * once a new, independent backend is configured (see README checklist).
 */
import { formatReference, looksAutomated, quoteSchema } from "../quote";
import type { EnquiryService, SubmitResult } from "./types";

let previewSeq = 0;

const previewAdapter: EnquiryService = {
  mode: "preview",
  async submitEnquiry(input, meta): Promise<SubmitResult> {
    // Same checks the future server function must repeat — never trust the client.
    if (!quoteSchema.safeParse(input).success) return { mode: "error", code: "validation" };
    if (looksAutomated(meta.startedAt, Date.now(), input.company)) return { mode: "error", code: "rate_limited" };
    await new Promise((r) => setTimeout(r, 700)); // simulate latency so pending UI is exercised
    previewSeq += 1;
    return { mode: "preview", reference: formatReference(previewSeq), delivered: false };
  },
};

export const enquiryService: EnquiryService = previewAdapter;
export const INTEGRATION_PENDING = enquiryService.mode === "preview";
