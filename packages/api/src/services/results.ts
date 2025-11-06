import Redis from "ioredis";

export interface ParseResult {
  jobId: string;
  status: "completed" | "failed";
  formats: {
    md_content?: string;
    json_content?: object;
    doctags_content?: string;
    html_content?: string;
  };
  metadata: {
    pages?: number;
    processingTime?: number;
    error?: string;
  };
  createdAt: number;
}

export class ResultStorage {
  private redis: Redis;
  private ttl: number;

  constructor(redis: Redis, ttl = 300) {
    // 5 minutes default
    this.redis = redis;
    this.ttl = ttl;
  }

  async store(result: ParseResult): Promise<void> {
    const key = `result:${result.jobId}`;
    await this.redis.setex(key, this.ttl, JSON.stringify(result));
  }

  async get(jobId: string): Promise<ParseResult | null> {
    const key = `result:${jobId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async delete(jobId: string): Promise<void> {
    await this.redis.del(`result:${jobId}`);
  }

  // Delete after retrieval (single-use)
  async getAndDelete(jobId: string): Promise<ParseResult | null> {
    const result = await this.get(jobId);
    if (result && process.env.SINGLE_USE_RESULTS !== "false") {
      // Delete after delay
      const delay = parseInt(process.env.RESULT_REMOVAL_DELAY || "300000"); // 5 min
      setTimeout(() => this.delete(jobId), delay);
    }
    return result;
  }
}
