import { OnboardingSaveSchema, OnboardingUpdateSchema } from "./onboarding.schema";

const validPayload = {
  income_sources: [{ name: "Salary", amount: 3000 }],
  credit_cards: [{ name: "Visa", limit: 5000, spendCap: 2000 }],
  total_income: 3000,
  savings_goal: 500,
};

describe("OnboardingSaveSchema", () => {
  it("accepts a valid onboarding payload", () => {
    const result = OnboardingSaveSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejects a non-numeric total_income", () => {
    const result = OnboardingSaveSchema.safeParse({
      ...validPayload,
      total_income: "3000" as unknown as number,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a NaN total_income", () => {
    const result = OnboardingSaveSchema.safeParse({
      ...validPayload,
      total_income: NaN,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-numeric income_sources amount", () => {
    const result = OnboardingSaveSchema.safeParse({
      ...validPayload,
      income_sources: [{ name: "Salary", amount: "3000" as unknown as number }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a NaN income_sources amount", () => {
    const result = OnboardingSaveSchema.safeParse({
      ...validPayload,
      income_sources: [{ name: "Salary", amount: NaN }],
    });
    expect(result.success).toBe(false);
  });
});

describe("OnboardingUpdateSchema", () => {
  it("accepts a partial payload", () => {
    const result = OnboardingUpdateSchema.safeParse({ total_income: 4000 });
    expect(result.success).toBe(true);
  });

  it("accepts an empty payload", () => {
    const result = OnboardingUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects a NaN savings_goal even in partial form", () => {
    const result = OnboardingUpdateSchema.safeParse({ savings_goal: NaN });
    expect(result.success).toBe(false);
  });
});
