/**
 * Emit an analytics event only after the live enquiry endpoint acknowledges a
 * successfully stored request. A reference identifies a request, not a person:
 * customers remain free to submit multiple distinct enquiries.
 *
 * Google Tag Manager can listen for `goodspotless_quote_submitted` and trigger
 * the Google Ads conversion tag after the conversion ID/label are configured.
 * No names, emails or phone numbers are sent with this event.
 */
const trackedReferences = new Set<string>();

export function trackSuccessfulEnquiry(reference: string): boolean {
  if (typeof window === "undefined" || !reference || trackedReferences.has(reference)) return false;
  trackedReferences.add(reference);
  const layerWindow = window as Window & { dataLayer?: Record<string, unknown>[] };
  layerWindow.dataLayer = layerWindow.dataLayer || [];
  layerWindow.dataLayer.push({ event: "goodspotless_quote_submitted", quote_reference: reference });
  window.dispatchEvent(new CustomEvent("goodspotless_quote_submitted", { detail: { reference } }));
  return true;
}
