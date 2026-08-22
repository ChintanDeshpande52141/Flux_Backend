import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { transactionsRouter } from "./modules/transactions/transactions.router";
import { subscriptionsRouter } from "./modules/subscriptions/subscriptions.router";
import { analyticsRouter } from "./modules/analytics/analytics.router";
import { chatRouter } from "./modules/chat/chat.router";
import onboardingRouter from "./modules/onboarding/onboarding.router";
import expensesRouter from "./modules/expenses/expenses.router";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();

// Environment-aware CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [
      "http://localhost:8081", // Expo web
      "http://localhost:19006", // Expo web alternative
      "http://localhost:3000", // Backend
      "http://10.0.2.2:3000", // Android emulator
      "http://192.168.0.175:3000", // Network backend access
      "http://192.168.0.175:8081", // Expo Go network
      "exp://192.168.0.175:8081", // Expo Go
      "exp://localhost:8081", // Expo Go local
      "http://127.0.0.1:8081", // Localhost alternative
      "http://127.0.0.1:19006", // Expo alternative
    ];

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    // Log the origin for debugging
    console.log("CORS - Origin:", origin);
    console.log("CORS - Allowed origins:", allowedOrigins);

    // For development, allow all origins
    if (process.env.NODE_ENV !== "production") {
      console.log("CORS - Allowing development origin:", origin);
      callback(null, true);
    } else {
      // In production, check allowed origins
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("CORS - Blocked origin:", origin);
        callback(new Error("Not allowed by CORS"), false);
      }
    }
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
  credentials: true, // Allow credentials for auth
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

app.use(errorHandler);

export default app;
