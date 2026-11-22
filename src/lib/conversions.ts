/**
 * Count only enquiries the live backend confirms as stored.
 * Preview submissions and failed requests must never become Google Ads leads.
 *
 * This is basic consent mode: the Google tag is not loaded until a visitor
 * chooses optional advertising cookies. No personal contact details are sent.
 */
const GOOGLE_ADS_TAG_ID = "AW-18581555323";
const GOOGLE_ADS_CONVERSION = "AW-18581555323/hYcsCJa1qr0dEPuQsJxF";
// Versioned key: legacy consent was collected before ads were disclosed.
const CONSENT_STORAGE_KEY = "lcr-ads-consent-v1";

const trackedReferences = new Set<string>();
const pendingConversions = new Set<string>();
let googleAdsTagLoaded = false;

type GoogleTagWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

const deniedConsent = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
} as const;

const measurementConsent = {
  ad_storage: "granted",
  ad_user_data: "granted",
  // This tag measures requests; the site does not use personalised ads or GA.
  ad_personalization: "denied",
  analytics_storage: "denied",
} as const;

function hasAdvertisingConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY) === "all";
  } catch {
    return false;
  }
}

/**
 * Called on page load and when the visitor changes cookie preferences.
 * A Google script is never injected while optional cookies are declined.
 */
export function syncGoogleAdsConsent(choice?: "all" | "essential"): void {
  if (typeof window === "undefined") return;
  const allowed = choice ? choice === "all" : hasAdvertisingConsent();
  const tagWindow = window as GoogleTagWindow;

  if (!allowed) {
    if (googleAdsTagLoaded) tagWindow.gtag?.("consent", "update", deniedConsent);
    return;
  }

  if (!googleAdsTagLoaded) {
    tagWindow.dataLayer = tagWindow.dataLayer || [];
    tagWindow.gtag = tagWindow.gtag || ((...args: unknown[]) => {
      tagWindow.dataLayer?.push(args);
    });

    // Consent must be declared before config and conversion events.
    tagWindow.gtag("consent", "default", deniedConsent);
    tagWindow.gtag("consent", "update", measurementConsent);
    tagWindow.gtag("js", new Date());
    tagWindow.gtag("config", GOOGLE_ADS_TAG_ID);

    const tagScript = document.createElement("script");
    tagScript.async = true;
    tagScript.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_TAG_ID}`;
    document.head.appendChild(tagScript);
    googleAdsTagLoaded = true;
  } else {
    tagWindow.gtag?.("consent", "update", measurementConsent);
  }

  for (const reference of pendingConversions) {
    tagWindow.gtag?.("event", "conversion", {
      send_to: GOOGLE_ADS_CONVERSION,
      transaction_id: reference,
    });
    pendingConversions.delete(reference);
  }
}

export function trackSuccessfulEnquiry(reference: string): boolean {
  if (typeof window === "undefined" || !reference || trackedReferences.has(reference)) return false;

  trackedReferences.add(reference);
  const tagWindow = window as GoogleTagWindow;
  tagWindow.dataLayer = tagWindow.dataLayer || [];
  tagWindow.dataLayer.push({ event: "goodspotless_quote_submitted", quote_reference: reference });
  window.dispatchEvent(new CustomEvent("goodspotless_quote_submitted", { detail: { reference } }));

  // Retain the successful request in this tab until consent is granted.
  // A distinct reference is a distinct conversion, even for a repeat customer.
  pendingConversions.add(reference);
  syncGoogleAdsConsent();
  return true;
}
