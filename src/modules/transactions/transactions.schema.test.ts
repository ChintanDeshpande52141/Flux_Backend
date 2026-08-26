import { GetTransactionsQuerySchema } from "./transactions.schema";

describe("GetTransactionsQuerySchema", () => {
  it("applies defaults when no query params are given", () => {
    const result = GetTransactionsQuerySchema.parse({});
    expect(result).toEqual({
      period: "This Month",
      paymentTypes: "All",
      categories: "All",
      limit: 50,
      offset: 0,
    });
  });

  it("accepts a valid Custom period with start/end", () => {
    const result = GetTransactionsQuerySchema.safeParse({
      period: "Custom",
      start: "2026-08-01",
      end: "2026-08-31",
    });
    expect(result.success).toBe(true);
  });

  it("rejects Custom period without start/end", () => {
    const result = GetTransactionsQuerySchema.safeParse({ period: "Custom" });
    expect(result.success).toBe(false);
  });

  it("rejects Custom period with only start", () => {
    const result = GetTransactionsQuerySchema.safeParse({
      period: "Custom",
      start: "2026-08-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects start after end", () => {
    const result = GetTransactionsQuerySchema.safeParse({
      period: "Custom",
      start: "2026-08-31",
      end: "2026-08-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-ISO date string for start", () => {
    const result = GetTransactionsQuerySchema.safeParse({
      period: "Custom",
      start: "08/01/2026",
      end: "2026-08-31",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid period value", () => {
    const result = GetTransactionsQuerySchema.safeParse({ period: "Yesterday" });
    expect(result.success).toBe(false);
  });

  it("accepts a comma-separated valid paymentTypes list", () => {
    const result = GetTransactionsQuerySchema.safeParse({ paymentTypes: "UPI,Cash" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid paymentTypes value", () => {
    const result = GetTransactionsQuerySchema.safeParse({ paymentTypes: "Bitcoin" });
    expect(result.success).toBe(false);
  });

  it("accepts a comma-separated valid categories list", () => {
    const result = GetTransactionsQuerySchema.safeParse({ categories: "Food,Transport" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid categories value", () => {
    const result = GetTransactionsQuerySchema.safeParse({ categories: "Crypto" });
    expect(result.success).toBe(false);
  });

  it("coerces and bounds limit/offset from query string values", () => {
    const result = GetTransactionsQuerySchema.parse({ limit: "25", offset: "10" });
    expect(result.limit).toBe(25);
    expect(result.offset).toBe(10);
  });

  it("rejects a limit above the 200 max", () => {
    const result = GetTransactionsQuerySchema.safeParse({ limit: "500" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-numeric limit instead of silently coercing to garbage", () => {
    const result = GetTransactionsQuerySchema.safeParse({ limit: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejects a negative offset", () => {
    const result = GetTransactionsQuerySchema.safeParse({ offset: "-1" });
    expect(result.success).toBe(false);
  });
});
