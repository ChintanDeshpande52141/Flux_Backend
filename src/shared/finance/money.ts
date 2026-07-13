export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type BillingCycle = "monthly" | "yearly";

export function toMonthlyAmount(amount: number, billingCycle: BillingCycle): number {
  return billingCycle === "yearly" ? amount / 12 : amount;
}

const AMOUNT_SHORTHAND_PATTERN = /^(\d+(?:\.\d+)?)k$/i;

export function parseAmountShorthand(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;

  const shorthandMatch = trimmed.match(AMOUNT_SHORTHAND_PATTERN);
  if (shorthandMatch) {
    return Number(shorthandMatch[1]) * 1000;
  }

  if (!/^\d+(?:\.\d+)?$/.test(trimmed)) return null;

  const value = Number(trimmed);
  return Number.isNaN(value) ? null : value;
}
