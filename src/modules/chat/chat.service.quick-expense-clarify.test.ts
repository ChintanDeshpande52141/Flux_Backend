const mockPoolQuery = jest.fn();
const mockClientConnect = jest.fn();

jest.mock("../../config/db", () => ({
  pool: {
    query: (...args: unknown[]) => mockPoolQuery(...args),
    connect: (...args: unknown[]) => mockClientConnect(...args),
  },
}));

jest.mock("../../shared/finance/money", () => {
  const actual = jest.requireActual("../../shared/finance/money");
  return {
    ...actual,
    parseAmountShorthand: jest.fn(() => null),
  };
});

import { processUserMessage } from "./chat.service";

describe("processUserMessage - malformed quick-expense amount", () => {
  beforeEach(() => {
    mockPoolQuery.mockReset();
    mockClientConnect.mockReset();
  });

  it("never reaches the transactions insert and returns a clarification reply when parseAmountShorthand returns null", async () => {
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ total_income: 3000, savings_goal: 500 }] }) // users select
      .mockResolvedValueOnce({
        rows: [{ id: "u1", text: "250 Swiggy", sender: "user", created_at: new Date() }],
      }) // saveMessage (user)
      .mockImplementationOnce((_sql: string, params: unknown[]) =>
        Promise.resolve({
          rows: [{ id: "a1", text: params[1], sender: "ai", created_at: new Date() }],
        }),
      ); // saveMessage (ai clarification reply)

    const result = await processUserMessage("user-1", "250 Swiggy");

    expect(mockClientConnect).not.toHaveBeenCalled(); // no transaction/insert path was ever entered
    expect(result.logged).toBeNull();
    expect(result.aiMessage.text).toContain("couldn't understand the amount");
  });
});
