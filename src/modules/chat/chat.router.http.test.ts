jest.mock("../../config/db", () => ({ pool: { query: jest.fn() } }));
jest.mock("../../config/supabase", () => ({ supabase: { auth: { getUser: jest.fn() } } }));
jest.mock("../../middleware/auth", () => ({
  authenticate: (req: any, _res: unknown, next: () => void) => {
    req.userId = "user-1";
    req.userEmail = "user@example.com";
    next();
  },
}));

import request from "supertest";

describe("GET /api/v1/chat/test-ai reachability", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.resetModules();
  });

  it("returns 404 in a production-configured deployment", async () => {
    jest.resetModules();
    process.env.NODE_ENV = "production";
    const app = require("../../app").default;

    const res = await request(app).get("/api/v1/chat/test-ai");

    expect(res.status).toBe(404);
  });

  it("is routed (not swallowed by the 404 handler) in development", async () => {
    jest.resetModules();
    process.env.NODE_ENV = "development";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    }) as unknown as typeof fetch;
    const app = require("../../app").default;

    const res = await request(app).get("/api/v1/chat/test-ai");

    expect(res.status).not.toBe(404);
  });
});
