import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import {
  handleGetOnboarding,
  handleSaveOnboarding,
  handleUpdateOnboarding,
} from "./onboarding.controller";

const router = Router();

router.use(authenticate);

router.get("/", handleGetOnboarding);
router.post("/", handleSaveOnboarding);
router.patch("/", handleUpdateOnboarding);

export default router;
