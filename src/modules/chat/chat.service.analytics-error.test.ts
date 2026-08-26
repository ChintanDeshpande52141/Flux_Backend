export {};

const mockPoolQuery = jest.fn();

jest.mock("../../config/db", () => ({
  pool: { query: (...args: unknown[]) => mockPoolQuery(...args) },
}));

describe("processUserMessage - analytics query failure", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    jest.resetModules();
    process.env.OPENROUTER_API_KEY = "test-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.OPENROUTER_API_KEY = originalKey;
    mockPoolQuery.mockReset();
  });

  it("logs the underlying DB error via console.error before substituting the fallback reply", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: "question",
                queryType: "food_spending_month",
                reply: "food_spending_month",
              }),
            },
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const dbError = new Error("connection terminated unexpectedly");

    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ total_income: 3000, savings_goal: 500 }] }) // users select
      .mockResolvedValueOnce({
        rows: [{ id: "u1", text: "how much did I spend on food this month", sender: "user", created_at: new Date() }],
      }) // saveMessage (user)
      .mockRejectedValueOnce(dbError) // SUM query for food_spending_month fails
      .mockImplementationOnce((_sql: string, params: unknown[]) =>
        Promise.resolve({
          rows: [{ id: "a1", text: params[1], sender: "ai", created_at: new Date() }],
        }),
      ); // saveMessage (ai fallback reply)

    const { processUserMessage } = require("./chat.service");
    const result = await processUserMessage("user-1", "how much did I spend on food this month");

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[processUserMessage] analytics query failed",
      dbError,
    );
    expect(result.aiMessage.text).toBe("I couldn't fetch your spending data. Please try again.");

    consoleErrorSpy.mockRestore();
  });
});
