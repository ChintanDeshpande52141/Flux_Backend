jest.mock("../../config/db", () => ({
  pool: { query: jest.fn() },
}));

import { pool } from "../../config/db";
import { getSafeToSpend } from "./analytics.service";
import { calculateBudget } from "../../shared/finance/budget";

const mockQuery = pool.query as jest.Mock;

describe("getSafeToSpend", () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it("delegates monthly budget math to calculateBudget instead of its own divisor literals", async () => {
    const totalIncome = 3100;
    const savingsGoal = 500;
    const spent = 200;

    mockQuery
      .mockResolvedValueOnce({
        rows: [{ total_income: totalIncome, savings_goal: savingsGoal }],
      }) // users query
      .mockResolvedValueOnce({
        rows: [{ amount: "1200", billing_cycle: "yearly" }],
      }) // subscriptions query (1200/year -> 100/month)
      .mockResolvedValueOnce({ rows: [{ total: spent }] }); // spend query

    const result = await getSafeToSpend("user-1", "monthly");

    const expected = calculateBudget({
      totalIncome,
      savingsGoal,
      totalMonthlyBills: 100,
      asOfDate: new Date(),
    });

    expect(result.amount).toBe(
      Math.round((expected.monthBudget - spent) * 100) / 100,
    );
    expect(result.dailyLimit).toBe(expected.dailyLimit);
  });

  it("normalizes yearly subscription billing via toMonthlyAmount, not inline SQL math", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ total_income: 5000, savings_goal: 0 }],
      })
      .mockResolvedValueOnce({
        rows: [
          { amount: "1200", billing_cycle: "yearly" }, // -> 100/month
          { amount: "50", billing_cycle: "monthly" }, // -> 50/month
        ],
      })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] });

    const result = await getSafeToSpend("user-1", "monthly");

    // totalMonthlyBills should be 150 (100 + 50); monthBudget = 5000 - 0 - 150 = 4850
    expect(result.amount).toBe(4850);
  });

  it("uses the shared yearBudget for the yearly period instead of a *365 literal", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ total_income: 3100, savings_goal: 0 }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] });

    const result = await getSafeToSpend("user-1", "yearly");

    const expected = calculateBudget({
      totalIncome: 3100,
      savingsGoal: 0,
      totalMonthlyBills: 0,
      asOfDate: new Date(),
    });

    expect(result.amount).toBe(expected.yearBudget);
  });
});
