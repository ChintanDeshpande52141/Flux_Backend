const mockPoolQuery = jest.fn();
const mockClientQuery = jest.fn();
const mockClient = { query: mockClientQuery, release: jest.fn() };

jest.mock("../../config/db", () => ({
  pool: {
    query: (...args: unknown[]) => mockPoolQuery(...args),
    connect: () => Promise.resolve(mockClient),
  },
}));

import { processUserMessage } from "./chat.service";

describe("processUserMessage - quick-expense regex parse", () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
    mockClientQuery.mockReset();
  });

  it("parses '5k' shorthand as 5000, not 5, and persists round2(amount)", async () => {
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ total_income: 3000, savings_goal: 500 }] }) // users select
      .mockResolvedValueOnce({
        rows: [{ id: "u1", text: "5k Swiggy", sender: "user", created_at: new Date() }],
      }); // saveMessage (user)

    mockClientQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            id: "t1",
            merchant: "Swiggy",
            category: "Food",
            amount: "5000",
            payment_type: "UPI",
            transacted_at: new Date(),
          },
        ],
      }) // INSERT INTO transactions
      .mockResolvedValueOnce({
        rows: [{ id: "a1", text: "Added ₹5,000 for Swiggy.", sender: "ai", created_at: new Date() }],
      }) // INSERT INTO messages (ai reply)
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const result = await processUserMessage("user-1", "5k Swiggy");

    const insertCall = mockClientQuery.mock.calls[1]; // second client.query call is the transactions insert
    const insertedAmount = insertCall[1][3]; // amount is the 4th bound param
    expect(insertedAmount).toBe(5000); // round2(5000), not parseFloat("5k") === 5
    expect(result.logged).not.toBeNull();
  });

  it("persists round2(amount) for a fractional quick-expense amount", async () => {
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ total_income: 3000, savings_goal: 500 }] })
      .mockResolvedValueOnce({
        rows: [{ id: "u1", text: "299.005 Cafe", sender: "user", created_at: new Date() }],
      });

    mockClientQuery
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [
          {
            id: "t2",
            merchant: "Cafe",
            category: "Food",
            amount: "299.01",
            payment_type: "UPI",
            transacted_at: new Date(),
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [{ id: "a2", text: "Added ₹299.01 for Cafe.", sender: "ai", created_at: new Date() }],
      })
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    await processUserMessage("user-1", "299.005 Cafe");

    const insertCall = mockClientQuery.mock.calls[1];
    const insertedAmount = insertCall[1][3];
    expect(insertedAmount).toBe(299.01); // round2(299.005)
  });
});
