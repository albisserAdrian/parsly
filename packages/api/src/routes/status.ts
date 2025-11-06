import { Hono } from "hono";
import type { Queue } from "bullmq";

export function createStatusRouter(queue: Queue) {
  const router = new Hono();

  // GET /v1/status/poll/:taskId - Poll task status with optional long polling
  router.get("/poll/:taskId", async (c) => {
    const taskId = c.req.param("taskId") as string;
    const timeout = parseInt(c.req.query("timeout") || "0"); // Long polling timeout in seconds

    try {
      const job = await queue.getJob(taskId);

      if (!job) {
        return c.json({ error: "Task not found" }, 404);
      }

      // If long polling requested, wait for state change
      if (timeout > 0) {
        const maxWait = Math.min(timeout * 1000, 30000); // Max 30 seconds
        const startTime = Date.now();

        while (Date.now() - startTime < maxWait) {
          const state = await job.getState();

          if (state === "completed" || state === "failed") {
            break;
          }

          // Wait 500ms before checking again
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      const state = await job.getState();
      const progress = job.progress;

      let response: any = {
        task_id: taskId,
        status: state,
        progress,
      };

      // Add additional info based on state
      if (state === "completed") {
        response.completed_at = job.finishedOn;
      } else if (state === "failed") {
        response.error = job.failedReason;
        response.failed_at = job.finishedOn;
      } else if (state === "active") {
        response.started_at = job.processedOn;
      }

      return c.json(response);
    } catch (error) {
      console.error("Status poll error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  return router;
}
