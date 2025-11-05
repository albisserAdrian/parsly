import { z } from "zod";

export const ParseSourceSchema = z.object({
  source_url: z.string().url(),
  ocr_engine: z.enum(["easyocr", "tesseract", "rapidocr"]).default("easyocr"),
  output_formats: z
    .array(
      z.enum(["md_content", "json_content", "doctags_content", "html_content"]),
    )
    .default(["md_content"]),
  target_type: z.enum(["InBody", "Zip", "S3", "Put"]).default("InBody"),
});

export const ParseFileSchema = z.object({
  ocr_engine: z.enum(["easyocr", "tesseract", "rapidocr"]).default("easyocr"),
  output_formats: z
    .array(
      z.enum(["md_content", "json_content", "doctags_content", "html_content"]),
    )
    .default(["md_content"]),
  target_type: z.enum(["InBody", "Zip", "S3", "Put"]).default("InBody"),
});

export const ChunkingSchema = z.object({
  source_url: z.string().url().optional(),
  chunking_method: z.enum(["hybrid", "hierarchical"]),
  max_chunk_size: z.number().positive().optional(),
  ocr_engine: z.enum(["easyocr", "tesseract", "rapidocr"]).default("easyocr"),
});

export type ParseSourceInput = z.infer<typeof ParseSourceSchema>;
export type ParseFileInput = z.infer<typeof ParseFileSchema>;
export type ChunkingInput = z.infer<typeof ChunkingSchema>;
