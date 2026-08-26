import { Request, Response } from "express";
import {
  getTransactions,
  createTransaction,
  CreateTransactionSchema,
} from "./transactions.service";

export async function handleGetTransactions(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const {
      period = "This Month",
      paymentTypes = "All",
      categories = "All",
      start,
      end,
    } = req.query as Record<string, string>;

    if (period === "Custom" && (!start || !end)) {
      res
        .status(400)
        .json({
          data: null,
          error: "start and end are required for Custom period",
        });
      return;
    }

    const data = await getTransactions(
      req.userId,
      period,
      paymentTypes,
      categories,
      start,
      end,
    );
    res.json({ data, error: null });
  } catch (err) {
    console.error("[handleGetTransactions]", err);
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}

export async function handleCreateTransaction(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const parsed = CreateTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ data: null, error: parsed.error.flatten() });
      return;
    }

    const data = await createTransaction(req.userId, parsed.data);
    res.status(201).json({ data, error: null });
  } catch (err) {
    console.error("[handleCreateTransaction]", err);
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}
