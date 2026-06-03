import { Request, Response } from "express";
import {
  getSafeToSpend,
  getSpendingVelocity,
  getCreditHealth,
  getSpendingPulse,
  getSpendingAnalysis,
  getTotals,
} from "./analytics.service";

export async function handleSafeToSpend(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const period = (req.query.period as string) || "monthly";
    const data = await getSafeToSpend(
      req.userId,
      period as "weekly" | "monthly" | "yearly",
    );
    res.json({ data, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}

export async function handleSpendingVelocity(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const data = await getSpendingVelocity(req.userId);
    res.json({ data, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}

export async function handleCreditHealth(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const data = await getCreditHealth(req.userId);
    if (!data) {
      res
        .status(404)
        .json({ data: null, error: "No credit health record found" });
      return;
    }
    res.json({ data, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}

export async function handleSpendingPulse(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const period = (req.query.period as string) || "weekly";
    const data = await getSpendingPulse(
      req.userId,
      period as "weekly" | "monthly" | "yearly",
    );
    res.json({ data, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}

export async function handleSpendingAnalysis(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const data = await getSpendingAnalysis(req.userId);
    res.json({ data, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}

export async function handleTotals(req: Request, res: Response): Promise<void> {
  try {
    const data = await getTotals(req.userId);
    res.json({ data, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}
