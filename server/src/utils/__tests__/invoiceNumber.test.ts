import { describe, it, expect } from "vitest";
import { formatInvoiceNumber } from "../invoiceNumber";

describe("formatInvoiceNumber", () => {
  it("zero-pads the sequence and derives a stable prefix", () => {
    const n = formatInvoiceNumber("11112222-3333-4444-5555-666677778888", 1);
    expect(n).toBe("INV-111122-00001");
  });

  it("produces monotonic, sortable numbers for one subscription", () => {
    const sub = "abcdef01-2345-6789-abcd-ef0123456789";
    const a = formatInvoiceNumber(sub, 1);
    const b = formatInvoiceNumber(sub, 2);
    expect(a < b).toBe(true);
  });

  it("gives different prefixes to different subscriptions (collision-safe)", () => {
    const a = formatInvoiceNumber("aaaaaaaa-0000-0000-0000-000000000000", 1);
    const b = formatInvoiceNumber("bbbbbbbb-0000-0000-0000-000000000000", 1);
    expect(a).not.toBe(b);
  });
});
