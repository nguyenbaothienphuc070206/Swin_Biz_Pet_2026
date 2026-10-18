export type InvoiceLine = { description: string; quantity: number; unitAmountMinor: number };
export function calculateInvoiceTotal(lines: InvoiceLine[]) {
  const subtotal = lines.reduce((sum, line) => {
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 0 || !Number.isSafeInteger(line.unitAmountMinor) || line.unitAmountMinor < 0) throw new Error("invalid_invoice_line");
    return sum + line.quantity * line.unitAmountMinor;
  }, 0);
  if (!Number.isSafeInteger(subtotal)) throw new Error("invoice_total_overflow");
  return { subtotalMinor: subtotal, totalMinor: subtotal };
}
