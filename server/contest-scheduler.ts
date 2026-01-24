import { storage } from "./storage";

class ContestScheduler {
  private intervals: Map<number, NodeJS.Timeout> = new Map();

  // Start monitoring for automatic contest ending
  async startMonitoring() {
    // Check every minute for contests that should end
    setInterval(async () => {
      await this.checkContestEndTimes();
    }, 60000); // 1 minute

    console.log("Contest scheduler started - checking for auto-end contests every minute");
  }

  // Check if any active contests should be automatically ended
  private async checkContestEndTimes() {
    try {
      const contests = await storage.getContests();
      const activeContests = contests.filter(c => c.status === "active" && c.endTime);

      for (const contest of activeContests) {
        if (contest.endTime && new Date() >= new Date(contest.endTime)) {
          const endTimeKST = new Date(contest.endTime).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
          console.log(`Auto-ending contest ${contest.id}: ${contest.title} (ended at ${endTimeKST} KST)`);
          await storage.endContestAndArchive(contest.id);
          console.log(`Contest ${contest.id} has been automatically archived`);
        }
      }
    } catch (error) {
      console.error("Error checking contest end times:", error);
    }
  }

  // Schedule a specific contest to start at a given time
  scheduleContestStart(contestId: number, startTime: Date) {
    const delay = startTime.getTime() - Date.now();
    
    if (delay <= 0) {
      console.log(`Contest ${contestId} start time has passed, not scheduling`);
      return;
    }

    // JavaScript setTimeout max is ~24.8 days (2^31-1 ms). Use 24 hours max per step.
    const MAX_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in ms
    
    const scheduleNext = () => {
      const remainingDelay = startTime.getTime() - Date.now();
      
      if (remainingDelay <= 0) {
        // Time to start the contest
        (async () => {
          try {
            console.log(`Auto-starting contest ${contestId}`);
            await storage.updateContestStatus(contestId, "active");
            this.intervals.delete(contestId);
          } catch (error) {
            console.error(`Error auto-starting contest ${contestId}:`, error);
          }
        })();
        return;
      }
      
      const nextDelay = Math.min(remainingDelay, MAX_TIMEOUT);
      const timeout = setTimeout(scheduleNext, nextDelay);
      this.intervals.set(contestId, timeout);
    };

    scheduleNext();
    console.log(`Scheduled contest ${contestId} to start at ${startTime.toISOString()}`);
  }

  // Schedule a specific contest to end at a given time
  scheduleContestEnd(contestId: number, endTime: Date) {
    const delay = endTime.getTime() - Date.now();
    
    if (delay <= 0) {
      console.log(`Contest ${contestId} end time has passed, not scheduling`);
      return;
    }

    // JavaScript setTimeout max is ~24.8 days (2^31-1 ms). Use 24 hours max per step.
    const MAX_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in ms
    
    const scheduleNext = () => {
      const remainingDelay = endTime.getTime() - Date.now();
      
      if (remainingDelay <= 0) {
        // Time to end the contest
        (async () => {
          try {
            console.log(`Auto-ending contest ${contestId}`);
            await storage.endContestAndArchive(contestId);
            this.intervals.delete(contestId);
          } catch (error) {
            console.error(`Error auto-ending contest ${contestId}:`, error);
          }
        })();
        return;
      }
      
      const nextDelay = Math.min(remainingDelay, MAX_TIMEOUT);
      const timeout = setTimeout(scheduleNext, nextDelay);
      this.intervals.set(contestId, timeout);
    };

    scheduleNext();
    console.log(`Scheduled contest ${contestId} to end at ${endTime.toISOString()}`);
  }

  // Cancel scheduled actions for a contest
  cancelScheduled(contestId: number) {
    const timeout = this.intervals.get(contestId);
    if (timeout) {
      clearTimeout(timeout);
      this.intervals.delete(contestId);
      console.log(`Cancelled scheduled actions for contest ${contestId}`);
    }
  }

  // Initialize scheduling for all existing contests
  async initializeScheduling() {
    try {
      const contests = await storage.getContests();
      
      for (const contest of contests) {
        if (contest.status === "draft" && contest.startTime) {
          this.scheduleContestStart(contest.id, new Date(contest.startTime));
        }
        
        if (contest.status === "active" && contest.endTime) {
          this.scheduleContestEnd(contest.id, new Date(contest.endTime));
        }
      }
      
      console.log(`Initialized scheduling for ${contests.length} contests`);
    } catch (error) {
      console.error("Error initializing contest scheduling:", error);
    }
  }
}

export const contestScheduler = new ContestScheduler();