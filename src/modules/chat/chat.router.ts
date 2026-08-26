import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { chatRateLimiter } from "../../middleware/rateLimiter";
import {
  handleGetMessages,
  handleSendMessage,
  handleGetSuggestions,
  handleTestAI,
} from "./chat.controller";

export const chatRouter = Router();

chatRouter.use(authenticate);

chatRouter.get("/messages", handleGetMessages);
chatRouter.post("/messages", chatRateLimiter, handleSendMessage);
chatRouter.get("/suggestions", handleGetSuggestions);

if (process.env.NODE_ENV !== "production") {
  chatRouter.get("/test-ai", handleTestAI);
}
