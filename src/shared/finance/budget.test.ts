import { calculateBudget } from "./budget";

describe("calculateBudget", () => {
  it("always subtracts totalMonthlyBills from the month budget", () => {
    const withBills = calculateBudget({
      totalIncome: 3000,
      savingsGoal: 500,
      totalMonthlyBills: 200,
      asOfDate: new Date(2026, 0, 15), // Jan, 31 days
    });
    expect(withBills.monthBudget).toBe(2300);

    const noBills = calculateBudget({
      totalIncome: 3000,
      savingsGoal: 500,
      totalMonthlyBills: 0,
      asOfDate: new Date(2026, 0, 15),
    });
    expect(noBills.monthBudget).toBe(2500);
  });

  it("never returns a negative month budget", () => {
    const result = calculateBudget({
      totalIncome: 100,
      savingsGoal: 500,
      totalMonthlyBills: 200,
      asOfDate: new Date(2026, 0, 15),
    });
    expect(result.monthBudget).toBe(0);
    expect(result.dailyLimit).toBe(0);
    expect(result.weekBudget).toBe(0);
  });

  it("derives dailyLimit from the actual days in a 31-day month (January)", () => {
    const result = calculateBudget({
      totalIncome: 3100,
      savingsGoal: 0,
      totalMonthlyBills: 0,
      asOfDate: new Date(2026, 0, 15),
    });
    expect(result.monthBudget).toBe(3100);
    expect(result.dailyLimit).toBe(100); // 3100 / 31
    expect(result.weekBudget).toBe(700); // 100 * 7
  });

  it("derives dailyLimit from the actual days in a 30-day month (April)", () => {
    const result = calculateBudget({
      totalIncome: 3000,
      savingsGoal: 0,
      totalMonthlyBills: 0,
      asOfDate: new Date(2026, 3, 15),
    });
    expect(result.dailyLimit).toBe(100); // 3000 / 30
  });

  it("derives dailyLimit from a non-leap-year February (28 days)", () => {
    const result = calculateBudget({
      totalIncome: 2800,
      savingsGoal: 0,
      totalMonthlyBills: 0,
      asOfDate: new Date(2026, 1, 10), // 2026 is not a leap year
    });
    expect(result.dailyLimit).toBe(100); // 2800 / 28
  });

  it("derives dailyLimit from a leap-year February (29 days)", () => {
    const result = calculateBudget({
      totalIncome: 2900,
      savingsGoal: 0,
      totalMonthlyBills: 0,
      asOfDate: new Date(2028, 1, 10), // 2028 is a leap year
    });
    expect(result.dailyLimit).toBe(100); // 2900 / 29
  });

  it("computes yearBudget as monthBudget * 12", () => {
    const result = calculateBudget({
      totalIncome: 3000,
      savingsGoal: 0,
      totalMonthlyBills: 0,
      asOfDate: new Date(2026, 0, 15),
    });
    expect(result.yearBudget).toBe(36000);
  });
});
