import { z } from "zod";

const IncomeSourceSchema = z.object({
  name: z.string().min(1),
  amount: z.number(),
});

const CreditCardSchema = z.object({
  name: z.string().min(1),
  limit: z.number(),
  spendCap: z.number(),
});

export const OnboardingSaveSchema = z.object({
  income_sources: z.array(IncomeSourceSchema),
  credit_cards: z.array(CreditCardSchema),
  total_income: z.number(),
  savings_goal: z.number(),
});

export const OnboardingUpdateSchema = OnboardingSaveSchema.partial();

export type OnboardingSaveInput = z.infer<typeof OnboardingSaveSchema>;
export type OnboardingUpdateInput = z.infer<typeof OnboardingUpdateSchema>;
