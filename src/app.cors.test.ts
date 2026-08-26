jest.mock("./config/db", () => ({ pool: { query: jest.fn() } }));
jest.mock("./config/supabase", () => ({ supabase: { auth: { getUser: jest.fn() } } }));

import request from "supertest";

describe("CORS allowlist is deterministic regardless of NODE_ENV", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalAllowed = process.env.ALLOWED_ORIGINS;

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnv;
    if (originalAllowed === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = originalAllowed;
    jest.resetModules();
  });

  it.each(["production", "development", "staging", undefined])(
    "allows a known origin when NODE_ENV=%s",
    async (nodeEnv) => {
      jest.resetModules();
      if (nodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = nodeEnv;
      const app = require("./app").default;

      const res = await request(app)
        .get("/health")
        .set("Origin", "http://localhost:8081");

      expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:8081");
      expect(res.status).toBe(200);
    },
  );

  it.each(["production", "development", "staging", undefined])(
    "blocks an unknown origin when NODE_ENV=%s",
    async (nodeEnv) => {
      jest.resetModules();
      if (nodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = nodeEnv;
      const app = require("./app").default;

      const res = await request(app)
        .get("/health")
        .set("Origin", "http://evil.example.com");

      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    },
  );

  it("allows requests with no Origin header (mobile apps, Postman)", async () => {
    jest.resetModules();
    process.env.NODE_ENV = "production";
    const app = require("./app").default;

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
  });
});
