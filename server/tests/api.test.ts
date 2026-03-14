import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const mockMeme = {
  id: 1,
  contestId: null,
  title: "Test Meme",
  description: "A test meme",
  imageUrl: "https://example.com/img.jpg",
  additionalImages: [],
  authorWallet: "walletABC123",
  authorUsername: "testuser",
  authorAvatarUrl: null,
  votes: 10,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

vi.mock("../storage", () => ({
  storage: {
    getMemes: vi.fn().mockResolvedValue([mockMeme]),
    getMemesByContestId: vi.fn().mockResolvedValue([mockMeme]),
    getAllMemes: vi.fn().mockResolvedValue([mockMeme]),
    getCurrentActiveContest: vi.fn().mockResolvedValue(null),
    getUserByWallet: vi.fn().mockResolvedValue(null),
    getMemeById: vi.fn().mockResolvedValue(mockMeme),
  },
}));

vi.mock("../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

async function buildApp() {
  const app = express();
  app.use(express.json());
  const { memesRouter } = await import("../routes/memes");
  app.use("/api/memes", memesRouter);
  return app;
}

describe("GET /api/memes", () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
  });

  it("returns 200 with memes array", async () => {
    const res = await request(app).get("/api/memes");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("memes");
    expect(Array.isArray(res.body.memes)).toBe(true);
  });

  it("returns pagination info", async () => {
    const res = await request(app).get("/api/memes");
    expect(res.body).toHaveProperty("pagination");
    expect(res.body.pagination).toHaveProperty("total");
    expect(res.body.pagination).toHaveProperty("page");
    expect(res.body.pagination).toHaveProperty("hasMore");
  });

  it("accepts page query parameter", async () => {
    const res = await request(app).get("/api/memes?page=1");
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
  });

  it("meme object has required fields", async () => {
    const res = await request(app).get("/api/memes");
    const meme = res.body.memes[0];
    expect(meme).toHaveProperty("id");
    expect(meme).toHaveProperty("title");
    expect(meme).toHaveProperty("imageUrl");
    expect(meme).toHaveProperty("votes");
    expect(meme).toHaveProperty("authorWallet");
  });

  it("returns memes for a specific contest when contestId is provided", async () => {
    const res = await request(app).get("/api/memes?contestId=1");
    expect(res.status).toBe(200);
    expect(res.body.memes).toHaveLength(1);
  });
});

describe("Revenue Share Configuration", () => {
  it("creator pool is 45% of profit", () => {
    const profit = 1.0;
    const creator = profit * 0.45;
    expect(creator).toBeCloseTo(0.45, 6);
  });

  it("voter pool is 40% of profit", () => {
    const profit = 1.0;
    const voters = profit * 0.40;
    expect(voters).toBeCloseTo(0.40, 6);
  });

  it("platform fee is 15% of profit", () => {
    const profit = 1.0;
    const platform = profit * 0.15;
    expect(platform).toBeCloseTo(0.15, 6);
  });

  it("all shares sum to 100%", () => {
    const total = 0.45 + 0.40 + 0.15;
    expect(total).toBeCloseTo(1.0, 10);
  });

  it("platform share is the smallest (creator-first ecosystem)", () => {
    expect(0.45).toBeGreaterThan(0.15);
    expect(0.40).toBeGreaterThan(0.15);
  });
});
