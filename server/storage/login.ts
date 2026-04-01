import { getDatabase } from "../db";
import { eq, and, desc, isNull, or, sql, inArray } from "drizzle-orm";
import { logger } from "../utils/logger";
import {
  loginLogs, blockedIps,
  type LoginLog, type InsertLoginLog, type BlockedIp, type InsertBlockedIp
} from "@shared/schema";

export class LoginStorage {
  private db = getDatabase();
  async logLogin(insertLoginLog: InsertLoginLog): Promise<LoginLog> {
    if (!this.db) throw new Error("Database not available");
    
    const [loginLog] = await this.db
      .insert(loginLogs)
      .values(insertLoginLog)
      .returning();
    return loginLog;
  }

  async getTodayLoginsByIp(ipAddress: string): Promise<string[]> {
    if (!this.db) throw new Error("Database not available");
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.db
      .selectDistinct({ walletAddress: loginLogs.walletAddress })
      .from(loginLogs)
      .where(and(
        eq(loginLogs.ipAddress, ipAddress),
        sql`${loginLogs.loginTime} >= ${today} AND ${loginLogs.loginTime} < ${tomorrow}`
      ));
    
    return result.map(row => row.walletAddress);
  }

  async getTodayLoginsByDeviceId(deviceId: string): Promise<string[]> {
    if (!this.db) throw new Error("Database not available");
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.db
      .selectDistinct({ walletAddress: loginLogs.walletAddress })
      .from(loginLogs)
      .where(and(
        eq(loginLogs.deviceId, deviceId),
        sql`${loginLogs.loginTime} >= ${today} AND ${loginLogs.loginTime} < ${tomorrow}`
      ));
    
    return result.map(row => row.walletAddress);
  }

  async blockIp(insertBlockedIp: InsertBlockedIp): Promise<BlockedIp> {
    if (!this.db) throw new Error("Database not available");
    
    const [blockedIp] = await this.db
      .insert(blockedIps)
      .values(insertBlockedIp)
      .returning();
    return blockedIp;
  }

  async unblockIp(ipAddress: string): Promise<void> {
    if (!this.db) throw new Error("Database not available");
    
    await this.db
      .delete(blockedIps)
      .where(eq(blockedIps.ipAddress, ipAddress));
  }

  async isIpBlocked(ipAddress: string): Promise<boolean> {
    if (!this.db) throw new Error("Database not available");
    
    const [blocked] = await this.db
      .select()
      .from(blockedIps)
      .where(eq(blockedIps.ipAddress, ipAddress));
    
    return !!blocked;
  }

  async getBlockedIps(): Promise<BlockedIp[]> {
    if (!this.db) throw new Error("Database not available");
    
    return await this.db
      .select()
      .from(blockedIps)
      .orderBy(desc(blockedIps.blockedAt));
  }

  async getRecentLogins(limit: number = 50): Promise<LoginLog[]> {
    if (!this.db) throw new Error("Database not available");
    
    return await this.db
      .select()
      .from(loginLogs)
      .orderBy(desc(loginLogs.loginTime))
      .limit(limit);
  }

  async getSuspiciousIps(): Promise<{ipAddress: string, walletCount: number, wallets: string[]}[]> {
    if (!this.db) throw new Error("Database not available");
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const suspiciousIps = await this.db
      .select({
        ipAddress: loginLogs.ipAddress,
        walletCount: sql<number>`count(distinct ${loginLogs.walletAddress})`,
        wallets: sql<string[]>`array_agg(distinct ${loginLogs.walletAddress})`
      })
      .from(loginLogs)
      .where(sql`${loginLogs.loginTime} >= ${today} AND ${loginLogs.loginTime} < ${tomorrow}`)
      .groupBy(loginLogs.ipAddress)
      .having(sql`count(distinct ${loginLogs.walletAddress}) >= 3`);
    
    return suspiciousIps;
  }

  async getSuspiciousDevices(): Promise<{deviceId: string, walletCount: number, wallets: string[]}[]> {
    if (!this.db) throw new Error("Database not available");
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const suspiciousDevices = await this.db
      .select({
        deviceId: loginLogs.deviceId,
        walletCount: sql<number>`count(distinct ${loginLogs.walletAddress})`,
        wallets: sql<string[]>`array_agg(distinct ${loginLogs.walletAddress})`
      })
      .from(loginLogs)
      .where(and(
        sql`${loginLogs.loginTime} >= ${today} AND ${loginLogs.loginTime} < ${tomorrow}`,
        sql`${loginLogs.deviceId} IS NOT NULL`
      ))
      .groupBy(loginLogs.deviceId)
      .having(sql`count(distinct ${loginLogs.walletAddress}) >= 3`);
    
    return suspiciousDevices.map(row => ({
      deviceId: row.deviceId!,
      walletCount: row.walletCount,
      wallets: row.wallets
    }));
  }
}
