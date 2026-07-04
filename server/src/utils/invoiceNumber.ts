/**
 * Format a human-readable, collision-free invoice number from a per-subscription
 * sequence. Pure (unit-testable). Prefixing with a fragment of the subscription
 * id keeps it unique across the whole `Invoice.number @unique` space — unlike the
 * old 4 random bytes, which would eventually collide.
 */
export const formatInvoiceNumber = (
  subscriptionId: string,
  sequence: number
): string => {
  const prefix = subscriptionId.replace(/-/g, "").slice(0, 6).toUpperCase();
  return `INV-${prefix}-${String(sequence).padStart(5, "0")}`;
};
