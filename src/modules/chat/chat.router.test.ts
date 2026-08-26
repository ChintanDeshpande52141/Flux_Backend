jest.mock("../../middleware/auth", () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock("../../middleware/rateLimiter", () => ({
  chatRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
jest.mock("./chat.controller", () => ({
  handleGetMessages: jest.fn(),
  handleSendMessage: jest.fn(),
  handleGetSuggestions: jest.fn(),
  handleTestAI: jest.fn(),
}));

function hasTestAiRoute(router: any): boolean {
  const stack = router.stack as Array<{ route?: { path: string } }>;
  return stack.some((layer) => layer.route?.path === "/test-ai");
}

describe("chatRouter test-ai route gating", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.resetModules();
  });

  it("does not register /test-ai when NODE_ENV is production", () => {
    jest.resetModules();
    process.env.NODE_ENV = "production";
    const { chatRouter } = require("./chat.router");
    expect(hasTestAiRoute(chatRouter)).toBe(false);
  });

  it("registers /test-ai when NODE_ENV is not production", () => {
    jest.resetModules();
    process.env.NODE_ENV = "development";
    const { chatRouter } = require("./chat.router");
    expect(hasTestAiRoute(chatRouter)).toBe(true);
  });
});
