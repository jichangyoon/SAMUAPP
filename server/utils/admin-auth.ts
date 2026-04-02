import { Request, Response, NextFunction } from "express";
import { config } from "../config";
import { logger } from "./logger";

function checkAdminCredentials(email: string, secret: string): boolean {
  if (!email || !config.ADMIN_EMAILS.includes(email.toLowerCase())) return false;
  if (config.ADMIN_SECRET && secret !== config.ADMIN_SECRET) return false;
  return true;
}

function extractCredentials(req: Request): { email: string; secret: string } {
  const email = String(req.headers["x-admin-email"] || req.body?.adminEmail || "");
  const secret = String(req.headers["x-admin-secret"] || req.body?.adminSecret || "");
  return { email, secret };
}

export function requireAdminMiddleware(req: Request, res: Response, next: NextFunction) {
  const { email, secret } = extractCredentials(req);
  if (!checkAdminCredentials(email, secret)) {
    logger.warn(`[Admin] Unauthorized access attempt — email: ${email || "(none)"}, path: ${req.path}`);
    return res.status(401).json({ error: "Admin access required" });
  }
  next();
}

export async function requireAdminAsync(req: Request, res: Response): Promise<boolean> {
  const { email, secret } = extractCredentials(req);
  if (!checkAdminCredentials(email, secret)) {
    logger.warn(`[Admin] Unauthorized access attempt — email: ${email || "(none)"}, path: ${req.path}`);
    res.status(401).json({ error: "Admin access required" });
    return false;
  }
  return true;
}
