import { describe, expect, it } from "vitest";
import { formatReference, isValidUkPostcode, looksAutomated, normalisePhone, outwardCode, quoteSchema, validatePhotos } from "./quote";

const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const valid = { service: "deep-cleaning", homeType: "flat", bedrooms: 2, bathrooms: 1, sizeSqft: "", frequency: "once", postcode: "nw6 2ab", date: tomorrow, timeWindow: "morning", notes: "", name: "Jane Smith", phone: "07700 900123", email: "jane@example.co.uk", privacyAccepted: true, marketingOptIn: false, company: "" };

describe("quote rules", () => {
  it("formats references as LCR-0001", () => {
    expect(formatReference(1)).toBe("LCR-0001");
    expect(formatReference(42)).toBe("LCR-0042");
  });
  it("validates UK postcodes", () => {
    expect(isValidUkPostcode("NW6 2AB")).toBe(true);
    expect(isValidUkPostcode("w97ab")).toBe(true);
    expect(isValidUkPostcode("12345")).toBe(false);
    expect(outwardCode("nw10 4xy")).toBe("NW10");
  });
  it("accepts UK and international phones", () => {
    expect(normalisePhone("07700 900123")).toBe("+447700900123");
    expect(normalisePhone("+44 (0)20 7946 0018")).toBe("+442079460018");
    expect(normalisePhone("+351 912 345 678")).toBe("+351912345678");
    expect(normalisePhone("123")).toBeNull();
  });
  it("requires privacy acknowledgement but marketing is optional", () => {
    expect(quoteSchema.safeParse(valid).success).toBe(true);
    expect(quoteSchema.safeParse({ ...valid, privacyAccepted: false }).success).toBe(false);
  });
  it("rejects past dates", () => {
    expect(quoteSchema.safeParse({ ...valid, date: "2000-01-01" }).success).toBe(false);
  });
  it("flags honeypot and too-fast submissions", () => {
    expect(looksAutomated(0, 1000, "")).toBe(true);
    expect(looksAutomated(0, 10000, "spam")).toBe(true);
    expect(looksAutomated(0, 10000, "")).toBe(false);
  });
  it("limits photos to 5 images under 8 MB", () => {
    expect(validatePhotos([{ type: "image/jpeg", size: 1000 }])).toBeNull();
    expect(validatePhotos([{ type: "application/pdf", size: 10 }])).toBe("err.photoType");
    expect(validatePhotos(Array(6).fill({ type: "image/png", size: 1 }))).toBe("err.photoCount");
  });
});
