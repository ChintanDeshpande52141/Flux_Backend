import { Request, Response } from "express";
import { z } from "zod";
import { createExpense, getExpenses } from "./expenses.service";

const CreateExpenseSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1),
  category: z.enum([
    "Food",
    "Transport",
    "Shopping",
    "Entertainment",
    "Others",
  ]),
  paymentType: z.enum(["UPI", "Cash", "Credit", "Debit"]),
  isRecurring: z.boolean(),
});

export async function handleCreateExpense(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const parsed = CreateExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ data: null, error: parsed.error.flatten() });
      return;
    }

    const expense = parsed.data;
    const result = await createExpense(req.userId, expense);

    res.status(201).json({ data: result, error: null });
  } catch (err) {
    console.error("[handleCreateExpense]", err);
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}

export async function handleGetExpenses(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { limit = 50, offset = 0, category } = req.query;

    const expenses = await getExpenses(
      req.userId,
      Number(limit),
      Number(offset),
      category as string,
    );

    res.json({ data: { expenses }, error: null });
  } catch (err) {
    console.error("[handleGetExpenses]", err);
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}
