import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { transactionsRouter } from "./modules/transactions/transactions.router";
import { subscriptionsRouter } from "./modules/subscriptions/subscriptions.router";
import { analyticsRouter } from "./modules/analytics/analytics.router";
import { chatRouter } from "./modules/chat/chat.router";
import onboardingRouter from "./modules/onboarding/onboarding.router";
import expensesRouter from "./modules/expenses/expenses.router";

dotenv.config();

const app = express();

const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/v1/transactions", transactionsRouter);
app.use("/api/v1/subscriptions", subscriptionsRouter);
app.use("/api/v1/analytics", analyticsRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/onboarding", onboardingRouter);
app.use("/api/v1/expenses", expensesRouter);

app.use((_req, res) => {
  res.status(404).json({ data: null, error: "Route not found" });
});

export default app;
