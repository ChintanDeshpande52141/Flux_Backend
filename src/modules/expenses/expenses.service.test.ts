const mockPoolQuery = jest.fn();

jest.mock("../../config/db", () => ({
  pool: { query: (...args: unknown[]) => mockPoolQuery(...args) },
}));

import { createExpense } from "./expenses.service";

describe("createExpense", () => {
  afterEach(() => {
    mockPoolQuery.mockReset();
  });

  it("persists round2(amount) for a one-time transaction, not the raw unrounded float", async () => {
    mockPoolQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "txn-1",
          merchant: "Cafe",
          category: "Food",
          amount: "299.01",
          payment_type: "UPI",
          transacted_at: "2026-08-01T00:00:00.000Z",
        },
      ],
    });

    await createExpense("user-1", {
      amount: 299.005,
      description: "Cafe",
      category: "Food",
      paymentType: "UPI",
      isRecurring: false,
    });

    const insertCall = mockPoolQuery.mock.calls[0];
    const insertedAmount = insertCall[1][3]; // amount is the 4th bound param
    expect(insertedAmount).toBe(299.01); // round2(299.005)
  });
});
