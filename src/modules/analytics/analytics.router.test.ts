jest.mock("../../middleware/auth", () => ({
  authenticate: (req: any, _res: unknown, next: () => void) => {
    req.userId = "user-1";
    next();
  },
}));
jest.mock("./analytics.controller", () => ({
  handleSafeToSpend: (_req: unknown, res: any) => res.json({ data: {}, error: null }),
  handleSpendingVelocity: (_req: unknown, res: any) => res.json({ data: {}, error: null }),
  handleSpendingPulse: (_req: unknown, res: any) => res.json({ data: {}, error: null }),
  handleSpendingAnalysis: (_req: unknown, res: any) => res.json({ data: {}, error: null }),
  handleTotals: (_req: unknown, res: any) => res.json({ data: {}, error: null }),
}));

import express from "express";
import request from "supertest";
import { analyticsRouter } from "./analytics.router";

describe("analyticsRouter credit-health removal", () => {
  const app = express();
  app.use("/api/v1/analytics", analyticsRouter);
  app.use((_req, res) => res.status(404).json({ data: null, error: "Route not found" }));

  it("GET /analytics/credit-health no longer exists", async () => {
    const res = await request(app).get("/api/v1/analytics/credit-health");
    expect(res.status).toBe(404);
  });

  it("other analytics routes remain reachable", async () => {
    const res = await request(app).get("/api/v1/analytics/safe-to-spend");
    expect(res.status).toBe(200);
  });
});
