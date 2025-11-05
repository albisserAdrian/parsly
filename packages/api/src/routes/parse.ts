import { Hono } from "hono";
import { nanoid } from "nanoid";
import type { Queue } from "bullmq";
import type { Storage } from "../services/storage";
import { ParseSourceSchema, ParseFileSchema } from "../schemas/parse";
import { ZodError } from "zod";

export function createParseRouter(queue: Queue, storage: Storage) {
  const router = new Hono();

  router.post("/source", async (c) => {
    try {
      const body = await c.req.json();
      const validated = ParseSourceSchema.parse(body);

      const jobId = nanoid();

      // Add job to queue
      await queue.add(jobId, {
        jobId,
        jobType: "parse-source" as const,
        source: validated.source_url,
        ocrEngine: validated.ocr_engine,
        outputFormats: validated.output_formats,
        targetType: validated.target_type,
      });

      return c.json(
        {
          task_id: jobId,
          status: "queued",
          message: "Parse job queued successfully",
        },
        202,
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return c.json(
          {
            error: "Validation error",
            details: error.errors,
          },
          400,
        );
      }
      console.error("Parse error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  router.post("/file", async (c) => {
    try {
      const formData = await c.req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return c.json({ error: "No file provided" }, 400);
      }

      // Validate other form fields
      const validated = ParseFileSchema.parse({
        ocr_engine: formData.get("ocr_engine") || "easyocr",
        output_formats: formData.get("output_formats")
          ? JSON.parse(formData.get("output_formats") as string)
          : ["md_content"],
        target_type: formData.get("target_type") || "InBody",
      });

      const jobId = nanoid();
      const fileName = `${jobId}/${file.name}`;

      // Upload file to S3
      const buffer = await file.arrayBuffer();
      await storage.upload(fileName, Buffer.from(buffer), file.type);

      // Add job to queue
      await queue.add(jobId, {
        jobId,
        jobType: "parse-file" as const,
        fileName,
        ocrEngine: validated.ocr_engine,
        outputFormats: validated.output_formats,
        targetType: validated.target_type,
      });

      return c.json(
        {
          task_id: jobId,
          status: "queued",
          message: "Parse job queued successfully",
        },
        202,
      );
    } catch (error) {
      if (error instanceof ZodError) {
        return c.json(
          {
            error: "Validation error",
            details: error.errors,
          },
          400,
        );
      }
      console.error("Parse error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  return router;
}
