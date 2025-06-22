import { pgTable, text, serial, integer, bigint, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const memes = pgTable("memes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  authorWallet: text("author_wallet").notNull(),
  authorUsername: text("author_username").notNull(),
  votes: bigint("votes", { mode: "number" }).notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
