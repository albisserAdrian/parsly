import { Queue } from "bullmq";
import Redis from "ioredis";

export type JobType =
  | "convert-source"
  | "convert-file"
  | "chunk-hybrid"
  | "chunk-hierarchical";

export interface ConversionJobData {
  jobId: string;
  jobType: JobType;
  source?: string; // URL or S3 key
  fileName?: string;
  ocrEngine: "easyocr" | "tesseract" | "rapidocr";
  outputFormats: (
    | "md_content"
    | "json_content"
    | "doctags_content"
    | "html_content"
  )[];
  targetType: "InBody" | "Zip" | "S3" | "Put";
  chunkingMethod?: "hybrid" | "hierarchical";
  maxChunkSize?: number;
}

export function createQueue() {
  const connection = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    maxRetriesPerRequest: null,
  });

  const queueName = process.env.QUEUE_NAME || "docling-conversions";

  const queue = new Queue<ConversionJobData>(queueName, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: false, // Keep for result retrieval
      removeOnFail: {
        count: 50,
      },
    },
  });

  return queue;
}
