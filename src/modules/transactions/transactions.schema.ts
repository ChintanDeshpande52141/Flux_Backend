import { z } from "zod";

const VALID_CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Others",
] as const;
const VALID_PAYMENT_TYPES = ["UPI", "Cash", "Credit", "Debit"] as const;
const VALID_PERIODS = ["Today", "This Week", "This Month", "Custom"] as const;

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isAllOrValidList(value: string, validValues: readonly string[]): boolean {
  if (value === "All") return true;
  return value
    .split(",")
    .map((v) => v.trim())
    .every((v) => (validValues as string[]).includes(v));
}

export const GetTransactionsQuerySchema = z
  .object({
    period: z.enum(VALID_PERIODS).default("This Month"),
    paymentTypes: z
      .string()
      .default("All")
      .refine((v) => isAllOrValidList(v, VALID_PAYMENT_TYPES), {
        message: `paymentTypes must be "All" or a comma-separated list of ${VALID_PAYMENT_TYPES.join(", ")}`,
      }),
    categories: z
      .string()
      .default("All")
      .refine((v) => isAllOrValidList(v, VALID_CATEGORIES), {
        message: `categories must be "All" or a comma-separated list of ${VALID_CATEGORIES.join(", ")}`,
      }),
    start: z.string().regex(ISO_DATE_REGEX, "start must be an ISO date (YYYY-MM-DD)").optional(),
    end: z.string().regex(ISO_DATE_REGEX, "end must be an ISO date (YYYY-MM-DD)").optional(),
    limit: z.coerce.number().int().positive().max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .superRefine((data, ctx) => {
    if (data.period === "Custom" && (!data.start || !data.end)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "start and end are required for Custom period",
        path: ["period"],
      });
    }
    if (data.start && data.end && data.start > data.end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "start must not be after end",
        path: ["start"],
      });
    }
  });

export type GetTransactionsQuery = z.infer<typeof GetTransactionsQuerySchema>;
