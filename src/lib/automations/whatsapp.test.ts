import { describe, expect, it } from "vitest";
import { createCleaningReply, createWhatsAppDraftLink } from "./whatsapp";

const enquiry = {
  name: "Test Client",
  reference: "LCR-1234",
  phone: "07700 900123",
  service: "deep-cleaning",
  postcode: "SW1A 1AA",
} as const;

describe("Goodspotless manual WhatsApp drafts", () => {
  it("prepares a branded price quote without sending it", () => {
    const url = createWhatsAppDraftLink({ ...enquiry, intent: "quoted", quotePence: 12550 });
    expect(url).toContain("phone=447700900123");
    const message = new URL(url!).searchParams.get("text") || "";
    expect(message).toContain("GOODSPOTLESS");
    expect(message).toContain("£125.50");
    expect(message).toContain("Nothing is booked until you confirm");
    expect(message).not.toContain("London Clean Route");
  });

  it("refuses to build a link to a malformed phone number", () => {
    expect(createWhatsAppDraftLink({ ...enquiry, phone: "not a phone", intent: "ask" })).toBeNull();
  });

  it("does not promise a booking in a reviewed enquiry", () => {
    const message = createCleaningReply({ ...enquiry, intent: "accepted" });
    expect(message).toContain("No appointment is booked yet");
  });
});
