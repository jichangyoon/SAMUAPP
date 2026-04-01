import { getDatabase } from "../db";
import { eq, and, desc, isNull, or, sql, inArray } from "drizzle-orm";
import { logger } from "../utils/logger";
import {
  goodsRevenueDistributions,
  type GoodsRevenueDistribution, type InsertGoodsRevenueDistribution
} from "@shared/schema";

export class GoodsDistributionStorage {
  private db = getDatabase();
  async createGoodsRevenueDistribution(data: InsertGoodsRevenueDistribution): Promise<GoodsRevenueDistribution> {
    if (!this.db) throw new Error("Database not available");
    const [dist] = await this.db.insert(goodsRevenueDistributions).values(data).returning();
    return dist;
  }

  async getGoodsRevenueDistributions(contestId?: number): Promise<GoodsRevenueDistribution[]> {
    if (!this.db) throw new Error("Database not available");
    if (contestId) {
      return this.db.select().from(goodsRevenueDistributions)
        .where(eq(goodsRevenueDistributions.contestId, contestId))
        .orderBy(desc(goodsRevenueDistributions.createdAt));
    }
    return this.db.select().from(goodsRevenueDistributions)
      .orderBy(desc(goodsRevenueDistributions.createdAt));
  }

  async getGoodsRevenueDistributionByOrderId(orderId: number): Promise<GoodsRevenueDistribution | undefined> {
    if (!this.db) throw new Error("Database not available");
    const [dist] = await this.db.select().from(goodsRevenueDistributions)
      .where(eq(goodsRevenueDistributions.orderId, orderId))
      .limit(1);
    return dist;
  }

  async deleteGoodsRevenueDistribution(id: number): Promise<void> {
    if (!this.db) throw new Error("Database not available");
    await this.db.delete(goodsRevenueDistributions).where(eq(goodsRevenueDistributions.id, id));
  }
}