import { describe, expect, it } from "vitest";
import { createCleaningReply, createWhatsAppDraftLink, parseEnquiryNotes } from "./whatsapp";

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

  it("keeps the reviewed enquiry message concise", () => {
    const message = createCleaningReply({ ...enquiry, intent: "accepted" });
    expect(message).not.toContain("No appointment is booked yet");
    expect(message).toContain("agree the scope of work, price and availability.");
  });

  it("shows customer-provided property, timing and extras in natural British English", () => {
    const notes = parseEnquiryNotes("Please pay attention to the stairs.\nLiving rooms: 2\nKitchens: 1\nRequested extras: oven, windows");
    expect(notes).toEqual({ livingRooms: 2, kitchens: 1, extras: ["oven", "windows"], description: "Please pay attention to the stairs." });
    const message = createCleaningReply({
      ...enquiry, intent: "accepted", homeType: "house", bedrooms: 3, bathrooms: 2,
      livingRooms: notes.livingRooms, kitchens: notes.kitchens, extras: notes.extras,
      notes: notes.description, frequency: "weekly", requestedDate: "2026-11-25", timeWindow: "morning",
    });
    expect(message).toContain("*CLEANING REQUEST ACCEPTED ✅*");
    expect(message).toContain("One-off deep cleaning");
    expect(message).toContain("3 bedrooms, 2 bathrooms, 2 living rooms, 1 kitchen");
    expect(message).toContain("Inside oven, Interior windows");
    expect(message).toContain("25 November 2026");
    expect(message).toContain("Morning (8am–12pm)");
    expect(message).toContain("Please pay attention to the stairs.");
    expect(message).not.toContain("No appointment is booked yet");
    expect(message).toContain("agree the scope of work, price and availability.");
  });

  it("acknowledges a newly received request without saying it has already been reviewed", () => {
    const message = createCleaningReply({ ...enquiry, intent: "received" });
    expect(message).toContain("*CLEANING REQUEST RECEIVED ✅*");
    expect(message).not.toContain("We've reviewed");
    expect(message).toContain("not booked yet");
  });

  it("does not manufacture missing room counts or confirmation dates", () => {
    const notes = parseEnquiryNotes("Please bring eco-friendly cleaning products.");
    expect(notes.livingRooms).toBeUndefined();
    const message = createCleaningReply({ ...enquiry, notes: notes.description, intent: "received" });
    expect(message).not.toContain("0 kitchen");
    expect(message).not.toContain("Confirmed date:");
  });
});
