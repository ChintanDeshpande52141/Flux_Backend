import { Request, Response } from "express";
import {
  getSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  CreateSubscriptionSchema,
  UpdateSubscriptionSchema,
} from "./subscriptions.service";

export async function handleGetSubscriptions(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const data = await getSubscriptions(req.userId);
    res.json({ data, error: null });
  } catch (err) {
    console.error("[handleGetSubscriptions]", err);
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}

export async function handleCreateSubscription(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const parsed = CreateSubscriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ data: null, error: parsed.error.flatten() });
      return;
    }
    const data = await createSubscription(req.userId, parsed.data);
    res.status(201).json({ data, error: null });
  } catch (err) {
    console.error("[handleCreateSubscription]", err);
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}

export async function handleUpdateSubscription(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const parsed = UpdateSubscriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ data: null, error: parsed.error.flatten() });
      return;
    }
    const data = await updateSubscription(
      req.userId,
      req.params["id"] as string,
      parsed.data,
    );
    if (!data) {
      res.status(404).json({ data: null, error: "Subscription not found" });
      return;
    }
    res.json({ data, error: null });
  } catch (err) {
    console.error("[handleUpdateSubscription]", err);
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}

export async function handleDeleteSubscription(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const deleted = await deleteSubscription(
      req.userId,
      req.params["id"] as string,
    );
    if (!deleted) {
      res.status(404).json({ data: null, error: "Subscription not found" });
      return;
    }
    res.json({ data: { message: "Deleted successfully" }, error: null });
  } catch (err) {
    console.error("[handleDeleteSubscription]", err);
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}
