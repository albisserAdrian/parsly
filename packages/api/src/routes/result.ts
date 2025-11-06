import { Hono } from "hono";
import type { Queue } from "bullmq";

export function createResultRouter(queue: Queue) {
  const router = new Hono();

  // GET /v1/result/:taskId - Retrieve task result
  router.get("/:taskId", async (c) => {
    const taskId = c.req.param("taskId");

    try {
      const job = await queue.getJob(taskId);

      if (!job) {
        return c.json({ error: "Task not found" }, 404);
      }

      const state = await job.getState();

      if (state !== "completed") {
        return c.json(
          {
            error: `Task is not completed. Current status: ${state}`,
            status: state,
          },
          400,
        );
      }

      const result = job.returnvalue;

      if (!result) {
        return c.json({ error: "No result available" }, 404);
      }

      // Schedule deletion if single-use results enabled
      if (process.env.SINGLE_USE_RESULTS !== "false") {
        const delay = parseInt(process.env.RESULT_REMOVAL_DELAY || "300000");
        setTimeout(async () => {
          try {
            await job.remove();
          } catch (error) {
            console.error(`Failed to remove job ${taskId}:`, error);
          }
        }, delay);
      }

      return c.json({
        task_id: taskId,
        status: "completed",
        result: {
          formats: result.formats,
          metadata: result.metadata,
        },
        completed_at: job.finishedOn,
      });
    } catch (error) {
      console.error("Result retrieval error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  return router;
}
