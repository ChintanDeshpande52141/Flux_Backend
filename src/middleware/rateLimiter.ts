import { Request, Response, NextFunction } from 'express';

const WINDOW_MS = 30_000;
const MAX_REQUESTS = 10;

const store = new Map<string, { count: number; resetAt: number }>();

export function chatRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const key = req.userId ?? req.ip ?? 'unknown';
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  if (entry.count >= MAX_REQUESTS) {
    res.status(429).json({
      data: null,
      error: `Too many messages. Please wait a moment before sending again.`,
    });
    return;
  }

  entry.count += 1;
  next();
}
