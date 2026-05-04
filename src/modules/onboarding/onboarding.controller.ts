import { Request, Response } from "express";
import {
  getOnboardingData,
  saveOnboardingData,
  updateOnboardingData,
} from "./onboarding.service";

export async function handleGetOnboarding(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    console.log(
      "[onboarding] GET - userId:",
      req.userId,
      "userEmail:",
      req.userEmail,
    );
    const data = await getOnboardingData(req.userId, req.userEmail);
    res.json({ data, error: null });
  } catch (err) {
    console.error("GET /onboarding error:", err);
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}

export async function handleSaveOnboarding(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await saveOnboardingData(req.userId, req.userEmail, req.body);
    res.json({ data: { success: true }, error: null });
  } catch (err) {
    console.error("POST /onboarding error:", err);
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}

export async function handleUpdateOnboarding(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await updateOnboardingData(req.userId, req.body);
    res.json({ data: { success: true }, error: null });
  } catch (err) {
    console.error("PATCH /onboarding error:", err);
    res.status(500).json({ data: null, error: "Internal server error" });
  }
}
