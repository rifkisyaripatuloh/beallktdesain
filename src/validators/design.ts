import { z } from "zod";

export const designTypeSchema = z.enum(["EVENT_TICKET", "PARKING_TICKET", "ENTRY_TICKET", "INVITATION", "MEMBERSHIP_CARD", "ID_CARD", "CUSTOM"]);
const elementSchema = z.object({
  id: z.string().min(1).max(128), type: z.enum(["text", "image", "rectangle", "circle", "line", "qr", "barcode", "svg", "background"]),
  name: z.string().max(128).optional(), x: z.number().finite(), y: z.number().finite(),
  width: z.number().positive().finite().optional(), height: z.number().positive().finite().optional(),
}).passthrough();
export const designConfigSchema = z.object({
  version: z.number().int().positive(), type: designTypeSchema,
  canvas: z.object({ width: z.number().int().positive().max(10000), height: z.number().int().positive().max(10000), unit: z.string().max(8).optional(), background: z.string().optional() }).passthrough(),
  elements: z.array(elementSchema).max(500),
}).strict();

