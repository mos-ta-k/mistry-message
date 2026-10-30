import { z } from "zod";

export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(1000, "Message cannot exceed 1000 characters"),
  // Honeypot field — bots fill it, humans don't
  website: z.string().max(0, "Spam detected").optional(),
});
