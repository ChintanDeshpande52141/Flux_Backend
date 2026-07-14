const mockPoolQuery = jest.fn();

jest.mock("../../config/db", () => ({
  pool: { query: (...args: unknown[]) => mockPoolQuery(...args) },
}));

import { createSubscription, getSubscriptions } from "./subscriptions.service";

describe("createSubscription", () => {
  afterEach(() => {
    mockPoolQuery.mockReset();
  });

  it("persists round2(amount), not the raw unrounded float", async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "sub-1",
          name: "Netflix",
          amount: "299.005",
          billing_cycle: "monthly",
        },
      ],
    });

    await createSubscription("user-1", {
      name: "Netflix",
      amount: 299.005,
      billingCycle: "monthly",
      nextBillingDate: "2026-08-01",
      category: "Entertainment",
    });

    const insertCall = mockPoolQuery.mock.calls[0];
    const insertedAmount = insertCall[1][3]; // amount is the 4th bound param
    expect(insertedAmount).toBe(299.01); // round2(299.005)
  });
});

describe("getSubscriptions", () => {
  afterEach(() => {
    mockPoolQuery.mockReset();
  });

  it("uses shared toMonthlyAmount (no local toMonthly helper) to normalize yearly billing", async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "1",
          name: "Yearly Plan",
          amount: "1200",
          billing_cycle: "yearly",
          category: "Entertainment",
          next_billing_date: "2027-01-01",
        },
        {
          id: "2",
          name: "Monthly Plan",
          amount: "50",
          billing_cycle: "monthly",
          category: "Entertainment",
          next_billing_date: "2026-08-01",
        },
      ],
    });

    const result = await getSubscriptions("user-1");

    // 1200/12 (=100) + 50 = 150
    expect(result.totalMonthly).toBe(150);
  });
});
