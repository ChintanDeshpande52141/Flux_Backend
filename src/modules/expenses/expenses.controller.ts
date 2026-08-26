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

const GetExpensesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  category: z.string().optional(),
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
    const parsed = GetExpensesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ data: null, error: parsed.error.flatten() });
      return;
    }

    const { limit, offset, category } = parsed.data;

    const expenses = await getExpenses(req.userId, limit, offset, category);

    res.json({ data: { expenses }, error: null });
  } catch (err) {
    console.error("[handleGetExpenses]", err);
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}
