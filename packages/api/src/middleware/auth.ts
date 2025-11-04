import { Context, Next } from "hono";

export async function apiKeyAuth(c: Context, next: Next) {
  const apiKey = process.env.API_KEY;

  // Skip if not configured
  if (!apiKey) {
    return next();
  }

  const providedKey = c.req.header("X-Api-Key");

  if (providedKey !== apiKey) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return next();
}
