import { Hono } from "hono";
import Redis from "ioredis";

export function createHealthRouter(redis: Redis) {
  const router = new Hono();

  router.get("/", async (c) => {
    try {
      // Check Redis connectivity
      const pingResult = await redis.ping();
      const redisHealthy = pingResult === "PONG";

      // Get Redis info
      const redisInfo = await redis.info("memory");
      const memoryMatch = redisInfo.match(/used_memory_human:([^\r\n]+)/);
      const usedMemory = memoryMatch ? memoryMatch[1] : "unknown";

      const status = redisHealthy ? "healthy" : "unhealthy";

      return c.json(
        {
          status,
          timestamp: new Date().toISOString(),
          services: {
            redis: {
              status: redisHealthy ? "up" : "down",
              memory: usedMemory,
            },
          },
          uptime: process.uptime(),
        },
        redisHealthy ? 200 : 503,
      );
    } catch (error) {
      console.error("Health check error:", error);
      return c.json(
        {
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          error: "Failed to check service health",
        },
        503,
      );
    }
  });

  return router;
}
