import { pgTable, text, serial, integer, bigint, timestamp, boolean } from "drizzle-orm/pg-core";
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
  originalContestId: integer("original_contest_id").notNull(),
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
  votingPower: bigint("voting_power", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const nfts = pgTable("nfts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  imageUrl: text("image_url").notNull(),
  tokenId: integer("token_id").notNull().unique(),
  creator: text("creator").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const nftComments = pgTable("nft_comments", {
  id: serial("id").primaryKey(),
  nftId: integer("nft_id").notNull(),
  userWallet: text("user_wallet").notNull(),
  username: text("username").notNull(),
  comment: text("comment").notNull(),
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
  votingPower: bigint("voting_power", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull().unique(),
  email: text("email").unique(),
  username: text("username").notNull(),
  displayName: text("display_name"), // 프로필에서 설정하는 이름
  avatarUrl: text("avatar_url"),
  samuBalance: bigint("samu_balance", { mode: "number" }).notNull().default(0),
  totalVotingPower: bigint("total_voting_power", { mode: "number" }).notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMemeSchema = createInsertSchema(memes).omit({
  id: true,
  votes: true,
  createdAt: true,
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  createdAt: true,
});

export const insertNftSchema = createInsertSchema(nfts).omit({
  id: true,
  createdAt: true,
});

export const insertNftCommentSchema = createInsertSchema(nftComments).omit({
  id: true,
  createdAt: true,
});

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
export type InsertNft = z.infer<typeof insertNftSchema>;
export type Nft = typeof nfts.$inferSelect;
export type InsertNftComment = z.infer<typeof insertNftCommentSchema>;
export type NftComment = typeof nftComments.$inferSelect;
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
