const mockPoolQuery = jest.fn();

jest.mock("../../config/db", () => ({
  pool: { query: (...args: unknown[]) => mockPoolQuery(...args) },
}));

import { createTransaction } from "./transactions.service";

describe("createTransaction", () => {
  afterEach(() => {
    mockPoolQuery.mockReset();
  });

  it("persists round2(amount), not the raw unrounded float", async () => {
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

    await createTransaction("user-1", {
      merchant: "Cafe",
      category: "Food",
      amount: 299.005,
      paymentType: "UPI",
      transactedAt: "2026-08-01T00:00:00.000Z",
    });

    const insertCall = mockPoolQuery.mock.calls[0];
    const insertedAmount = insertCall[1][3]; // amount is the 4th bound param
    expect(insertedAmount).toBe(299.01); // round2(299.005)
  });
});
