import { round2, toMonthlyAmount, parseAmountShorthand } from "./money";

describe("round2", () => {
  it("rounds to 2 decimal places", () => {
    expect(round2(10.005)).toBe(10.01);
    expect(round2(10.004)).toBe(10);
    expect(round2(10)).toBe(10);
  });
});

describe("toMonthlyAmount", () => {
  it("divides yearly amounts by 12", () => {
    expect(toMonthlyAmount(1200, "yearly")).toBe(100);
  });

  it("leaves monthly amounts unchanged", () => {
    expect(toMonthlyAmount(100, "monthly")).toBe(100);
  });
});

describe("parseAmountShorthand", () => {
  it("parses 'k'-suffixed shorthand", () => {
    expect(parseAmountShorthand("5k")).toBe(5000);
  });

  it("rejects malformed double-suffix input", () => {
    expect(parseAmountShorthand("5kk")).toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(parseAmountShorthand("abc")).toBeNull();
  });

  it("parses plain numeric input", () => {
    expect(parseAmountShorthand("300")).toBe(300);
  });
});
