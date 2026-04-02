import { getDatabase } from "../db";
import { eq, and, desc, isNull, or, sql, inArray } from "drizzle-orm";
import { logger } from "../utils/logger";
import {
  contests, archivedContests, memes, votes,
  type Contest, type InsertContest, type ArchivedContest, type InsertArchivedContest, type Meme
} from "@shared/schema";
import { enrichMemesWithProfiles } from "./shared";

export class ContestStorage {
  private db = getDatabase();
  async createContest(insertContest: InsertContest): Promise<Contest> {
    if (!this.db) throw new Error("Database not available");
    
    const [contest] = await this.db
      .insert(contests)
      .values(insertContest)
      .returning();
    return contest;
  }

  async getContests(): Promise<Contest[]> {
    if (!this.db) throw new Error("Database not available");
    
    return await this.db
      .select()
      .from(contests)
      .orderBy(desc(contests.createdAt));
  }

  async getContestById(id: number): Promise<Contest | undefined> {
    if (!this.db) throw new Error("Database not available");
    
    const [contest] = await this.db
      .select()
      .from(contests)
      .where(eq(contests.id, id));
    return contest;
  }

  async updateContestStatus(id: number, status: string): Promise<Contest> {
    if (!this.db) throw new Error("Database not available");
    
    const [contest] = await this.db
      .update(contests)
      .set({ status, updatedAt: new Date() })
      .where(eq(contests.id, id))
      .returning();
    
    return contest;
  }

  async updateContestTimes(id: number, startTime: Date, endTime: Date): Promise<Contest> {
    if (!this.db) throw new Error("Database not available");
    
    const [contest] = await this.db
      .update(contests)
      .set({ 
        status: "active",
        startTime, 
        endTime, 
        updatedAt: new Date() 
      })
      .where(eq(contests.id, id))
      .returning();
    
    return contest;
  }

  async getCurrentActiveContest(): Promise<Contest | undefined> {
    if (!this.db) throw new Error("Database not available");
    
    const [contest] = await this.db
      .select()
      .from(contests)
      .where(eq(contests.status, "active"))
      .limit(1);
    
    return contest;
  }

  async endContestAndArchive(contestId: number): Promise<ArchivedContest> {
    if (!this.db) throw new Error("Database not available");
    
    // Get contest details
    const contest = await this.getContestById(contestId);
    if (!contest) {
      throw new Error("Contest not found");
    }

    if (contest.status === "archived") {
      logger.info(`Contest ${contestId} is already archived, skipping`);
      const existing = await this.db
        .select()
        .from(archivedContests)
        .where(eq(archivedContests.originalContestId, contestId))
        .limit(1);
      if (existing.length > 0) return existing[0];
      logger.info(`Contest ${contestId} marked archived but no archive record, proceeding with archival`);
    } else if (contest.status === "archiving") {
      logger.info(`Contest ${contestId} is already being archived by another process, skipping`);
      const existing = await this.db
        .select()
        .from(archivedContests)
        .where(eq(archivedContests.originalContestId, contestId))
        .limit(1);
      if (existing.length > 0) return existing[0];
      logger.info(`Contest ${contestId} marked archiving but no archive record, proceeding with archival`);
    } else {
      await this.db
        .update(contests)
        .set({ status: "archiving" })
        .where(eq(contests.id, contestId));
      logger.info(`Contest ${contestId} status set to archiving`);
    }

    try {
    // Get all memes for this contest - current active contest memes have contestId = null
    // OR memes that already belong to this specific contest
    const contestMemes = await this.db
      .select()
      .from(memes)
      .where(or(
        isNull(memes.contestId),
        eq(memes.contestId, contestId)
      ))
      .orderBy(desc(memes.votes));

    // Allow ending contest even with no memes

    // Move all contest files to archive in R2 storage (parallel batches of 10)
    if (contestMemes.length > 0) {
      const { moveToArchive, extractKeyFromUrl } = await import('../r2-storage');
      
      let archiveSuccess = 0;
      let archiveFail = 0;
      const failedFiles: string[] = [];
      const BATCH_SIZE = 10;

      const processMeme = async (meme: typeof contestMemes[0]) => {
        const updateFields: { imageUrl?: string; additionalImages?: string[]; animatedThumbnailUrl?: string | null } = {};

        if (meme.imageUrl) {
          const key = extractKeyFromUrl(meme.imageUrl);
          if (key) {
            try {
              const result = await moveToArchive(key, contestId);
              if (result.success && result.url) {
                updateFields.imageUrl = result.url;
                archiveSuccess++;
              } else {
                archiveFail++;
                failedFiles.push(`meme-${meme.id}-main: ${meme.imageUrl}`);
              }
            } catch (err: any) {
              archiveFail++;
              failedFiles.push(`meme-${meme.id}-main: ${meme.imageUrl}`);
            }
          }
        }

        if (meme.animatedThumbnailUrl) {
          const key = extractKeyFromUrl(meme.animatedThumbnailUrl);
          if (key) {
            try {
              const result = await moveToArchive(key, contestId);
              if (result.success && result.url) {
                updateFields.animatedThumbnailUrl = result.url;
                archiveSuccess++;
              } else {
                archiveFail++;
                failedFiles.push(`meme-${meme.id}-animated-thumb: ${meme.animatedThumbnailUrl}`);
              }
            } catch (err: any) {
              archiveFail++;
              failedFiles.push(`meme-${meme.id}-animated-thumb: ${meme.animatedThumbnailUrl}`);
            }
          }
        }

        if (meme.additionalImages && Array.isArray(meme.additionalImages) && meme.additionalImages.length > 0) {
          const archivedAdditional: string[] = [];
          for (let i = 0; i < meme.additionalImages.length; i++) {
            const imgUrl = meme.additionalImages[i];
            const key = extractKeyFromUrl(imgUrl);
            if (key) {
              try {
                const result = await moveToArchive(key, contestId);
                if (result.success && result.url) {
                  archivedAdditional.push(result.url);
                  archiveSuccess++;
                } else {
                  archivedAdditional.push(imgUrl);
                  archiveFail++;
                  failedFiles.push(`meme-${meme.id}-additional-${i}: ${imgUrl}`);
                }
              } catch (err: any) {
                archivedAdditional.push(imgUrl);
                archiveFail++;
                failedFiles.push(`meme-${meme.id}-additional-${i}: ${imgUrl}`);
              }
            } else {
              archivedAdditional.push(imgUrl);
            }
          }
          updateFields.additionalImages = archivedAdditional;
        }

        if (Object.keys(updateFields).length > 0) {
          await this.db!
            .update(memes)
            .set(updateFields)
            .where(eq(memes.id, meme.id));
        }
      };

      for (let i = 0; i < contestMemes.length; i += BATCH_SIZE) {
        const batch = contestMemes.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(meme => processMeme(meme).catch(err => {
          archiveFail++;
          failedFiles.push(`meme-${meme.id}-unexpected: ${err?.message || err}`);
          logger.error(`[Archive] Unexpected error for meme ${meme.id}:`, err);
        })));
        logger.info(`[Archive] Progress: ${Math.min(i + BATCH_SIZE, contestMemes.length)}/${contestMemes.length} memes processed`);
      }

      logger.info(`[Archive] Contest ${contestId} file migration complete: ${archiveSuccess} succeeded, ${archiveFail} failed out of ${archiveSuccess + archiveFail} total files`);
      if (failedFiles.length > 0) {
        logger.error(`[Archive] Failed files for contest ${contestId}:`, failedFiles);
      }
    }

    // Calculate stats
    const totalMemes = contestMemes.length;
    const totalVotes = contestMemes.reduce((sum, meme) => sum + meme.votes, 0);
    const uniqueParticipants = contestMemes.length > 0 ? new Set(contestMemes.map(meme => meme.authorWallet)).size : 0;

    // Get top 3 memes (handle empty contest)
    const sortedMemes = contestMemes.sort((a, b) => b.votes - a.votes);
    const winnerMemeId = sortedMemes[0]?.id || null;
    const secondMemeId = sortedMemes[1]?.id || null;
    const thirdMemeId = sortedMemes[2]?.id || null;

    // 세 DB 쓰기를 단일 트랜잭션으로 묶기: INSERT archivedContest + UPDATE contest 상태 + UPDATE memes.contestId
    // 중간 실패 시 전체 롤백되어 데이터 불일치 방지
    const archivedContest = await this.db.transaction(async (tx) => {
      let result: ArchivedContest;

      try {
        const [inserted] = await tx
          .insert(archivedContests)
          .values({
            originalContestId: contestId,
            title: contest.title,
            description: contest.description,
            totalMemes,
            totalVotes,
            totalParticipants: uniqueParticipants,
            winnerMemeId,
            secondMemeId,
            thirdMemeId,
            prizePool: contest.prizePool,
            startTime: contest.startTime || contest.createdAt || new Date(),
            endTime: new Date(),
          })
          .returning();
        result = inserted;
      } catch (insertError: any) {
        if (insertError?.code === '23505') {
          logger.info(`Contest ${contestId} archive insert conflict (unique constraint), fetching existing`);
          const existing = await tx
            .select()
            .from(archivedContests)
            .where(eq(archivedContests.originalContestId, contestId))
            .limit(1);
          if (existing.length > 0) {
            result = existing[0];
          } else {
            throw insertError;
          }
        } else {
          throw insertError;
        }
      }

      // Update contest status to archived
      await tx
        .update(contests)
        .set({ status: "archived" })
        .where(eq(contests.id, contestId));

      // Move current contest memes to archived contest (only if there are memes)
      if (contestMemes.length > 0) {
        await tx
          .update(memes)
          .set({ contestId: contestId })
          .where(or(
            isNull(memes.contestId),
            eq(memes.contestId, contestId)
          ));
      }

      return result;
    });

    // Cancel any scheduled timers for this contest
    try {
      const { contestScheduler } = await import('../contest-scheduler');
      contestScheduler.cancelScheduled(contestId);
      logger.info(`Cancelled scheduled actions for contest ${contestId}`);
    } catch (error) {
      logger.error("Failed to cancel scheduled actions:", error);
    }

    logger.info(`Contest ${contestId} archived with ${totalMemes} files moved to archives/contest-${contestId}/`);

    return archivedContest;
    } catch (archiveError) {
      logger.error(`[Archive] Critical failure for contest ${contestId}, reverting to ended:`, archiveError);
      try {
        await this.updateContestStatus(contestId, "ended");
      } catch (revertError) {
        logger.error(`[Archive] Failed to revert contest ${contestId} status:`, revertError);
      }
      throw archiveError;
    }
  }

  async getArchivedContests(): Promise<ArchivedContest[]> {
    if (!this.db) throw new Error("Database not available");
    
    const archived = await this.db
      .select()
      .from(archivedContests)
      .orderBy(desc(archivedContests.archivedAt));

    const allMemeIds = archived.flatMap(c => 
      [c.winnerMemeId, c.secondMemeId, c.thirdMemeId].filter((id): id is number => id !== null)
    );

    let memeMap = new Map<number, Meme>();
    if (allMemeIds.length > 0) {
      const allMemes = await this.db
        .select()
        .from(memes)
        .where(inArray(memes.id, allMemeIds));
      const enriched = await enrichMemesWithProfiles(allMemes);
      memeMap = new Map(enriched.map(m => [m.id, m]));
    }

    const enrichedContests = archived.map(contest => ({
      ...contest,
      winnerMeme: contest.winnerMemeId ? memeMap.get(contest.winnerMemeId) || null : null,
      secondMeme: contest.secondMemeId ? memeMap.get(contest.secondMemeId) || null : null,
      thirdMeme: contest.thirdMemeId ? memeMap.get(contest.thirdMemeId) || null : null,
    }));

    // Filter out contests with no winner (empty contests) for Hall of Fame
    return enrichedContests.filter(contest => contest.winnerMeme !== null);
  }
}
