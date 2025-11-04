import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import Redis from "ioredis";
import { createHealthRouter } from "./routes/health";
import { apiKeyAuth } from "./middleware/auth";
import { errorHandler } from "./middleware/errors";

const app = new Hono();

// Global middleware
app.use("*", logger());
app.use("*", cors());

// Optional API key authentication (only if API_KEY is set)
if (process.env.API_KEY) {
  console.log("API key authentication enabled");
  app.use("/v1/*", apiKeyAuth);
}

// Create Redis connection for health checks
const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
});

// Health check endpoint (no auth required)
app.route("/health", createHealthRouter(redis));

// Error handling
app.onError(errorHandler);

const port = process.env.PORT || 3000;
const env = process.env.NODE_ENV || "development";

console.log(`🚀 Parsly API Server`);
console.log(`   Environment: ${env}`);
console.log(`   Port: ${port}`);
console.log(
  `   Redis: ${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || "6379"}`,
);
console.log(`   Queue: ${process.env.QUEUE_NAME || "docling-conversions"}`);
console.log(`   Running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
