import { Request, Response } from "express";
import {
  getOnboardingData,
  saveOnboardingData,
  updateOnboardingData,
} from "./onboarding.service";
import { OnboardingSaveSchema, OnboardingUpdateSchema } from "./onboarding.schema";

export async function handleGetOnboarding(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const data = await getOnboardingData(req.userId, req.userEmail);
    res.json({ data, error: null });
  } catch (err) {
    console.error("[handleGetOnboarding]", err);
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}

export async function handleSaveOnboarding(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const parsed = OnboardingSaveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ data: null, error: parsed.error.flatten() });
      return;
    }

    await saveOnboardingData(req.userId, req.userEmail, parsed.data);
    res.json({ data: { success: true }, error: null });
  } catch (err) {
    console.error("[handleSaveOnboarding]", err);
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}

export async function handleUpdateOnboarding(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const parsed = OnboardingUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ data: null, error: parsed.error.flatten() });
      return;
    }

    await updateOnboardingData(req.userId, parsed.data);
    res.json({ data: { success: true }, error: null });
  } catch (err) {
    console.error("[handleUpdateOnboarding]", err);
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}
