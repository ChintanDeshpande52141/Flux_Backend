const mockClientQuery = jest.fn();
const mockClient = { query: mockClientQuery, release: jest.fn() };
const mockPoolQuery = jest.fn();

jest.mock("../../config/db", () => ({
  pool: {
    query: (...args: unknown[]) => mockPoolQuery(...args),
    connect: () => Promise.resolve(mockClient),
  },
}));

import { saveOnboardingData, updateOnboardingData } from "./onboarding.service";

describe("saveOnboardingData", () => {
  afterEach(() => {
    mockClientQuery.mockReset();
  });

  it("includes totalMonthlyBills in its calculateBudget call (parity with updateOnboardingData)", async () => {
    mockClientQuery
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // INSERT users ON CONFLICT
      .mockResolvedValueOnce({}) // UPDATE users
      .mockResolvedValueOnce({
        rows: [{ amount: "1200", billing_cycle: "yearly" }],
      }) // SELECT subscriptions -> 100/month
      .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE user_budgets
      .mockResolvedValueOnce({}); // COMMIT

    await saveOnboardingData("user-1", "user@example.com", {
      income_sources: [],
      credit_cards: [],
      total_income: 3100,
      savings_goal: 500,
    });

    const budgetUpdateCall = mockClientQuery.mock.calls.find((call) =>
      String(call[0]).includes("UPDATE user_budgets"),
    );
    expect(budgetUpdateCall).toBeDefined();
    const [monthBudget, weekBudget, dailyLimit] = budgetUpdateCall![1];
    // 3100 - 500 - 100 (bills) = 2500 monthBudget
    expect(monthBudget).toBe(2500);
    expect(dailyLimit).toBeGreaterThan(0);
    expect(weekBudget).toBe(Math.round(dailyLimit * 7 * 100) / 100);
  });
});

describe("updateOnboardingData", () => {
  afterEach(() => {
    mockPoolQuery.mockReset();
  });

  it("produces the same monthBudget/weekBudget/dailyLimit as saveOnboardingData for identical inputs", async () => {
    mockPoolQuery
      .mockResolvedValueOnce({}) // UPDATE users
      .mockResolvedValueOnce({
        rows: [{ total_income: 3100, savings_goal: 500 }],
      }) // SELECT users
      .mockResolvedValueOnce({
        rows: [{ amount: "1200", billing_cycle: "yearly" }],
      }) // SELECT subscriptions
      .mockResolvedValueOnce({ rowCount: 1 }); // UPDATE user_budgets

    await updateOnboardingData("user-1", { total_income: 3100, savings_goal: 500 });

    const budgetUpdateCall = mockPoolQuery.mock.calls.find((call) =>
      String(call[0]).includes("UPDATE user_budgets"),
    );
    expect(budgetUpdateCall).toBeDefined();
    const [monthBudget] = budgetUpdateCall![1];
    expect(monthBudget).toBe(2500); // identical to saveOnboardingData's result above
  });
});
