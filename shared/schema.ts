import { pgTable, text, serial, integer, bigint, timestamp, boolean, uniqueIndex, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const contests = pgTable("contests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"), // draft, active, ended, archived
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  prizePool: text("prize_pool"),
  durationDays: integer("duration_days").default(7), // 콘테스트 기간 (일 단위)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const memes = pgTable("memes", {
  id: serial("id").primaryKey(),
  contestId: integer("contest_id"), // null for current contest, specific ID for archived contests
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  authorWallet: text("author_wallet").notNull(),
  authorUsername: text("author_username").notNull(),
  authorAvatarUrl: text("author_avatar_url"),
  votes: bigint("votes", { mode: "number" }).notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const archivedContests = pgTable("archived_contests", {
  id: serial("id").primaryKey(),
  originalContestId: integer("original_contest_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  totalMemes: integer("total_memes").notNull().default(0),
  totalVotes: bigint("total_votes", { mode: "number" }).notNull().default(0),
  totalParticipants: integer("total_participants").notNull().default(0),
  winnerMemeId: integer("winner_meme_id"),
  secondMemeId: integer("second_meme_id"),
  thirdMemeId: integer("third_meme_id"),
  prizePool: text("prize_pool"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  archivedAt: timestamp("archived_at").notNull().defaultNow(),
});

export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  memeId: integer("meme_id").notNull(),
  voterWallet: text("voter_wallet").notNull(),
  samuAmount: bigint("samu_amount", { mode: "number" }).notNull().default(0),
  txSignature: text("tx_signature"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});


export const partnerMemes = pgTable("partner_memes", {
  id: serial("id").primaryKey(),
  partnerId: text("partner_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  authorWallet: text("author_wallet").notNull(),
  authorUsername: text("author_username").notNull(),
  votes: bigint("votes", { mode: "number" }).notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const partnerVotes = pgTable("partner_votes", {
  id: serial("id").primaryKey(),
  partnerId: text("partner_id").notNull(),
  memeId: integer("meme_id").notNull(),
  voterWallet: text("voter_wallet").notNull(),
  samuAmount: bigint("samu_amount", { mode: "number" }).notNull().default(0),
  txSignature: text("tx_signature"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  email: text("email").unique(),
  username: text("username").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  samuBalance: bigint("samu_balance", { mode: "number" }).notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// IP 추적 시스템 테이블들
export const loginLogs = pgTable("login_logs", {
  id: serial("id").primaryKey(),
  ipAddress: text("ip_address").notNull(),
  deviceId: text("device_id"), // 디바이스 고유 ID
  walletAddress: text("wallet_address").notNull(),
  userAgent: text("user_agent"),
  loginTime: timestamp("login_time").notNull().defaultNow(),
});

export const blockedIps = pgTable("blocked_ips", {
  id: serial("id").primaryKey(),
  ipAddress: text("ip_address").notNull().unique(),
  reason: text("reason"),
  blockedAt: timestamp("blocked_at").notNull().defaultNow(),
  blockedBy: text("blocked_by"), // 관리자 지갑주소
});

// 수익 분배 시스템
export const revenues = pgTable("revenues", {
  id: serial("id").primaryKey(),
  contestId: integer("contest_id").notNull(),
  source: text("source").notNull(), // 'goods', 'other'
  description: text("description"),
  totalAmountSol: doublePrecision("total_amount_sol").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'distributed', 'cancelled'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  distributedAt: timestamp("distributed_at"),
});

export const revenueShares = pgTable("revenue_shares", {
  id: serial("id").primaryKey(),
  revenueId: integer("revenue_id").notNull(),
  contestId: integer("contest_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  role: text("role").notNull(), // 'creator', 'voter', 'platform'
  sharePercent: doublePrecision("share_percent").notNull(),
  amountSol: doublePrecision("amount_sol").notNull(),
  txSignature: text("tx_signature"),
  status: text("status").notNull().default("pending"), // 'pending', 'paid', 'failed'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const goods = pgTable("goods", {
  id: serial("id").primaryKey(),
  printfulProductId: bigint("printful_product_id", { mode: "number" }),
  printfulVariantId: bigint("printful_variant_id", { mode: "number" }),
  contestId: integer("contest_id"),
  memeId: integer("meme_id"),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  mockupUrls: text("mockup_urls").array(),
  category: text("category").notNull().default("clothing"),
  productType: text("product_type").notNull().default("t-shirt"),
  basePrice: doublePrecision("base_price").notNull(),
  retailPrice: doublePrecision("retail_price").notNull(),
  sizes: text("sizes").array(),
  colors: text("colors").array(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  goodsId: integer("goods_id").notNull(),
  buyerWallet: text("buyer_wallet").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  printfulOrderId: bigint("printful_order_id", { mode: "number" }),
  size: text("size").notNull(),
  color: text("color").notNull(),
  quantity: integer("quantity").notNull().default(1),
  totalPrice: doublePrecision("total_price").notNull(),
  solAmount: doublePrecision("sol_amount"),
  txSignature: text("tx_signature"),
  shippingName: text("shipping_name").notNull(),
  shippingAddress1: text("shipping_address1").notNull(),
  shippingAddress2: text("shipping_address2"),
  shippingCity: text("shipping_city").notNull(),
  shippingState: text("shipping_state"),
  shippingCountry: text("shipping_country").notNull(),
  shippingZip: text("shipping_zip").notNull(),
  shippingPhone: text("shipping_phone"),
  status: text("status").notNull().default("pending"),
  printfulStatus: text("printful_status"),
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const goodsRevenueDistributions = pgTable("goods_revenue_distributions", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  contestId: integer("contest_id").notNull(),
  totalSolAmount: doublePrecision("total_sol_amount").notNull(),
  creatorWallet: text("creator_wallet").notNull(),
  creatorAmount: doublePrecision("creator_amount").notNull(),
  platformAmount: doublePrecision("platform_amount").notNull(),
  voterPoolAmount: doublePrecision("voter_pool_amount").notNull(),
  status: text("status").notNull().default("completed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const voterRewardPool = pgTable("voter_reward_pool", {
  id: serial("id").primaryKey(),
  contestId: integer("contest_id").notNull(),
  rewardPerShare: doublePrecision("reward_per_share").notNull().default(0),
  totalDeposited: doublePrecision("total_deposited").notNull().default(0),
  totalClaimed: doublePrecision("total_claimed").notNull().default(0),
  totalShares: doublePrecision("total_shares").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const voterClaimRecords = pgTable("voter_claim_records", {
  id: serial("id").primaryKey(),
  contestId: integer("contest_id").notNull(),
  voterWallet: text("voter_wallet").notNull(),
  sharePercent: doublePrecision("share_percent").notNull(),
  lastClaimedRewardPerShare: doublePrecision("last_claimed_reward_per_share").notNull().default(0),
  totalClaimed: doublePrecision("total_claimed").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRevenueSchema = createInsertSchema(revenues).omit({
  id: true,
  createdAt: true,
  distributedAt: true,
});

export const insertRevenueShareSchema = createInsertSchema(revenueShares).omit({
  id: true,
  createdAt: true,
});

export const insertGoodsRevenueDistributionSchema = createInsertSchema(goodsRevenueDistributions).omit({
  id: true,
  createdAt: true,
});

export const insertVoterRewardPoolSchema = createInsertSchema(voterRewardPool).omit({
  id: true,
  updatedAt: true,
});

export const insertVoterClaimRecordSchema = createInsertSchema(voterClaimRecords).omit({
  id: true,
  updatedAt: true,
});

export type Revenue = typeof revenues.$inferSelect;
export type InsertRevenue = z.infer<typeof insertRevenueSchema>;
export type RevenueShare = typeof revenueShares.$inferSelect;
export type InsertRevenueShare = z.infer<typeof insertRevenueShareSchema>;
export type GoodsRevenueDistribution = typeof goodsRevenueDistributions.$inferSelect;
export type InsertGoodsRevenueDistribution = z.infer<typeof insertGoodsRevenueDistributionSchema>;
export type VoterRewardPool = typeof voterRewardPool.$inferSelect;
export type InsertVoterRewardPool = z.infer<typeof insertVoterRewardPoolSchema>;
export type VoterClaimRecord = typeof voterClaimRecords.$inferSelect;
export type InsertVoterClaimRecord = z.infer<typeof insertVoterClaimRecordSchema>;

export const insertMemeSchema = createInsertSchema(memes).omit({
  id: true,
  votes: true,
  createdAt: true,
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  createdAt: true,
});

export const insertLoginLogSchema = createInsertSchema(loginLogs).omit({
  id: true,
  loginTime: true,
});

export const insertBlockedIpSchema = createInsertSchema(blockedIps).omit({
  id: true,
  blockedAt: true,
});

export type LoginLog = typeof loginLogs.$inferSelect;
export type InsertLoginLog = typeof loginLogs.$inferInsert;
export type BlockedIp = typeof blockedIps.$inferSelect;
export type InsertBlockedIp = typeof blockedIps.$inferInsert;


export const insertPartnerMemeSchema = createInsertSchema(partnerMemes).omit({
  id: true,
  votes: true,
  createdAt: true,
});

export const insertPartnerVoteSchema = createInsertSchema(partnerVotes).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContestSchema = createInsertSchema(contests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertArchivedContestSchema = createInsertSchema(archivedContests).omit({
  id: true,
  archivedAt: true,
});

export type InsertMeme = z.infer<typeof insertMemeSchema>;
export type Meme = typeof memes.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votes.$inferSelect;

export type InsertPartnerMeme = z.infer<typeof insertPartnerMemeSchema>;
export type PartnerMeme = typeof partnerMemes.$inferSelect;
export type InsertPartnerVote = z.infer<typeof insertPartnerVoteSchema>;
export type PartnerVote = typeof partnerVotes.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertContest = z.infer<typeof insertContestSchema>;
export type Contest = typeof contests.$inferSelect;
export type InsertArchivedContest = z.infer<typeof insertArchivedContestSchema>;
export type ArchivedContest = typeof archivedContests.$inferSelect;

export const insertGoodsSchema = createInsertSchema(goods).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Goods = typeof goods.$inferSelect;
export type InsertGoods = z.infer<typeof insertGoodsSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
