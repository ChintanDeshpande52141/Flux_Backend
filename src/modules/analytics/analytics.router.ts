import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import {
  handleSafeToSpend,
  handleSpendingVelocity,
  handleSpendingPulse,
  handleSpendingAnalysis,
  handleTotals,
} from "./analytics.controller";

export const analyticsRouter = Router();

analyticsRouter.use(authenticate);

analyticsRouter.get("/safe-to-spend", handleSafeToSpend);
analyticsRouter.get("/spending-velocity", handleSpendingVelocity);
analyticsRouter.get("/spending-pulse", handleSpendingPulse);
analyticsRouter.get("/spending-analysis", handleSpendingAnalysis);
analyticsRouter.get("/totals", handleTotals);
