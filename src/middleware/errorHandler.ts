import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void {
  const error = err instanceof Error ? err : new Error(String(err));

  console.error(
    `[errorHandler] ${req.method} ${req.originalUrl} userId=${req.userId ?? "unauthenticated"}:`,
    error.stack ?? error.message,
  );

  if (res.headersSent) {
    return;
  }

  res.status(500).json({ data: null, error: "Internal server error" });
}
