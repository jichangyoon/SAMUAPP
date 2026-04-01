import { getDatabase } from "../db";
import { eq, and, desc, isNull, or, sql, inArray } from "drizzle-orm";
import { logger } from "../utils/logger";
import {
  goods, orders,
  type Goods, type InsertGoods, type Order, type InsertOrder
} from "@shared/schema";

export class GoodsStorage {
  private db = getDatabase();
  async getGoods(): Promise<Goods[]> {
    if (!this.db) throw new Error("Database not available");
    return await this.db
      .select()
      .from(goods)
      .where(eq(goods.status, "active"))
      .orderBy(desc(goods.createdAt));
  }

  async getGoodsById(id: number): Promise<Goods | undefined> {
    if (!this.db) throw new Error("Database not available");
    const [item] = await this.db
      .select()
      .from(goods)
      .where(eq(goods.id, id));
    return item;
  }

  async createGoods(data: InsertGoods): Promise<Goods> {
    if (!this.db) throw new Error("Database not available");
    const [item] = await this.db
      .insert(goods)
      .values(data)
      .returning();
    return item;
  }

  async updateGoods(id: number, data: Partial<InsertGoods>): Promise<Goods> {
    if (!this.db) throw new Error("Database not available");
    const [item] = await this.db
      .update(goods)
      .set(data)
      .where(eq(goods.id, id))
      .returning();
    return item;
  }

  async getOrders(walletAddress: string): Promise<Order[]> {
    if (!this.db) throw new Error("Database not available");
    return await this.db
      .select()
      .from(orders)
      .where(eq(orders.buyerWallet, walletAddress))
      .orderBy(desc(orders.createdAt));
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    if (!this.db) throw new Error("Database not available");
    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);
    return order;
  }

  async getOrderByTxSignature(txSignature: string): Promise<Order | undefined> {
    if (!this.db) throw new Error("Database not available");
    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.txSignature, txSignature))
      .limit(1);
    return order;
  }

  async getOrderByPrintfulId(printfulOrderId: number): Promise<Order | undefined> {
    if (!this.db) throw new Error("Database not available");
    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.printfulOrderId, printfulOrderId))
      .limit(1);
    return order;
  }

  async createOrder(data: InsertOrder): Promise<Order> {
    if (!this.db) throw new Error("Database not available");
    const [order] = await this.db
      .insert(orders)
      .values(data)
      .returning();
    return order;
  }

  async updateOrder(id: number, data: Partial<InsertOrder>): Promise<Order> {
    if (!this.db) throw new Error("Database not available");
    const [order] = await this.db
      .update(orders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async getAllOrders(): Promise<Order[]> {
    if (!this.db) throw new Error("Database not available");
    return this.db.select().from(orders).orderBy(desc(orders.createdAt));
  }
}