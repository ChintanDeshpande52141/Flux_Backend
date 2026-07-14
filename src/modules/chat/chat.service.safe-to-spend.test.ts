const mockPoolQuery = jest.fn();
const mockClientQuery = jest.fn();
const mockClient = { query: mockClientQuery, release: jest.fn() };

jest.mock("../../config/db", () => ({
  pool: {
    query: (...args: unknown[]) => mockPoolQuery(...args),
    connect: () => Promise.resolve(mockClient),
  },
}));

jest.mock("../analytics/analytics.service", () => ({
  getSafeToSpend: jest.fn(),
}));

describe("processUserMessage - safe_to_spend intent", () => {
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

  it("uses the shared getSafeToSpend result instead of a standalone formula", async () => {
    // Force the AI parser to return a safe_to_spend question intent
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: "question",
                queryType: "safe_to_spend",
                reply: "safe_to_spend",
              }),
            },
          },
        ],
      }),
    }) as unknown as typeof fetch;

    mockPoolQuery
      .mockResolvedValueOnce({
        rows: [{ total_income: 3000, savings_goal: 500 }],
      }) // users select
      .mockResolvedValueOnce({
        rows: [{ id: "u1", text: "what is my safe to spend", sender: "user", created_at: new Date() }],
      }); // saveMessage (user)

    const { getSafeToSpend } = require("../analytics/analytics.service");
    (getSafeToSpend as jest.Mock).mockResolvedValue({
      amount: 2222.5,
      currency: "INR",
      period: "this month",
      dailyLimit: 71.5,
    });

    mockPoolQuery.mockImplementationOnce((_sql: string, params: unknown[]) =>
      Promise.resolve({
        rows: [
          {
            id: "a1",
            text: params[1],
            sender: "ai",
            created_at: new Date(),
          },
        ],
      }),
    ); // saveMessage (ai reply) - echoes the actual reply text passed in

    const { processUserMessage } = require("./chat.service");
    const result = await processUserMessage("user-1", "what is my safe to spend");

    expect(getSafeToSpend).toHaveBeenCalledWith("user-1", "monthly");
    expect(result.aiMessage.text).toContain("2,222.5");
  });
});
