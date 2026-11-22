import { beforeEach, describe, expect, it, vi } from "vitest";

const scripts = () => document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]');
const conversions = () =>
  ((window as Window & { dataLayer?: unknown[] }).dataLayer ?? []).filter(
    (item): item is unknown[] => Array.isArray(item) && item[0] === "event" && item[1] === "conversion",
  );

beforeEach(() => {
  localStorage.clear();
  scripts().forEach((script) => script.remove());
  delete (window as Window & { gtag?: unknown }).gtag;
  delete (window as Window & { dataLayer?: unknown[] }).dataLayer;
  vi.resetModules();
});

describe("GOODSPOTLESS Google Ads conversions", () => {
  it("does not load tracking before permission and only counts each stored reference once", async () => {
    const { trackSuccessfulEnquiry, syncGoogleAdsConsent } = await import("./conversions");
    expect(trackSuccessfulEnquiry("LCR-0111")).toBe(true);
    expect(trackSuccessfulEnquiry("LCR-0111")).toBe(false);
    expect(scripts()).toHaveLength(0);
    expect(conversions()).toHaveLength(0);

    localStorage.setItem("lcr-ads-consent-v1", "all");
    syncGoogleAdsConsent();
    expect(scripts()).toHaveLength(1);
    expect(conversions()).toHaveLength(1);
    expect(conversions()[0][2]).toEqual({
      send_to: "AW-18581555323/hYcsCJa1qr0dEPuQsJxF",
      transaction_id: "LCR-0111",
    });

    syncGoogleAdsConsent();
    expect(conversions()).toHaveLength(1);
  });

  it("counts multiple distinct successful requests, but none while advertising is declined", async () => {
    const { trackSuccessfulEnquiry, syncGoogleAdsConsent } = await import("./conversions");
    localStorage.setItem("lcr-ads-consent-v1", "essential");
    expect(trackSuccessfulEnquiry("LCR-0201")).toBe(true);
    expect(scripts()).toHaveLength(0);

    syncGoogleAdsConsent("all");
    expect(conversions()).toHaveLength(1);
    expect(trackSuccessfulEnquiry("LCR-0202")).toBe(true);
    expect(conversions()).toHaveLength(2);

    syncGoogleAdsConsent("essential");
    expect(trackSuccessfulEnquiry("LCR-0203")).toBe(true);
    expect(conversions()).toHaveLength(2);
  });
});
