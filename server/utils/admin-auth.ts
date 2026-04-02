import { Request, Response, NextFunction } from "express";
import { config } from "../config";
import { logger } from "./logger";

function checkAdminCredentials(email: string): boolean {
  if (!email || !config.ADMIN_EMAILS.includes(email.toLowerCase())) return false;
  return true;
}

function extractEmail(req: Request): string {
  return String(req.headers["x-admin-email"] || req.body?.adminEmail || "");
}

export function requireAdminMiddleware(req: Request, res: Response, next: NextFunction) {
  const email = extractEmail(req);
  if (!checkAdminCredentials(email)) {
    logger.warn(`[Admin] Unauthorized access attempt — email: ${email || "(none)"}, path: ${req.path}`);
    return res.status(401).json({ error: "Admin access required" });
  }
  next();
}

export async function requireAdminAsync(req: Request, res: Response): Promise<boolean> {
  const email = extractEmail(req);
  if (!checkAdminCredentials(email)) {
    logger.warn(`[Admin] Unauthorized access attempt — email: ${email || "(none)"}, path: ${req.path}`);
    res.status(401).json({ error: "Admin access required" });
    return false;
  }
  return true;
}
