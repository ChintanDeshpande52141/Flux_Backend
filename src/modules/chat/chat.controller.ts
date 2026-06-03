import { Request, Response } from "express";
import { z } from "zod";
import {
  getMessages,
  processUserMessage,
  getSuggestions,
  parseWithAI,
} from "./chat.service";

const SendMessageSchema = z.object({
  text: z.string().min(1),
  sender: z.enum(["user", "ai"]),
  parsedData: z
    .object({
      intent: z.literal("log_expense"),
      merchant: z.string(),
      category: z.string(),
      amount: z.number(),
      paymentType: z.string(),
      isRecurring: z.boolean(),
      reply: z.string(),
    })
    .optional(),
});

export async function handleGetMessages(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const messages = await getMessages(req.userId);
    res.json({ data: { messages }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}

export async function handleSendMessage(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const parsed = SendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ data: null, error: parsed.error.flatten() });
      return;
    }

    const { text, sender, parsedData } = parsed.data;

    if (sender === "user") {
      const result = await processUserMessage(req.userId, text, parsedData);
      res.status(201).json({ data: result, error: null });
    } else {
      res
        .status(400)
        .json({ data: null, error: "Use sender: user to send messages" });
    }
  } catch (err) {
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}

export async function handleGetSuggestions(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const suggestions = await getSuggestions(req.userId);
    res.json({ data: { suggestions }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}

export async function handleTestAI(req: Request, res: Response): Promise<void> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    res.json({ data: { status: response.status, models: data }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: String(err) });
  }
}
