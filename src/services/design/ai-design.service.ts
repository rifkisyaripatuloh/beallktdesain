import "server-only";
import { prisma } from "@/lib/prisma";
import { failure, success } from "@/lib/api-response";
import { getCurrentUserId } from "@/lib/auth";
import { designConfigSchema, designTypeSchema } from "@/validators/design";
import { z } from "zod";

const requestSchema = z.object({
  prompt: z.string().trim().min(8).max(2000),
  type: designTypeSchema,
  width: z.number().int().positive().max(10000).default(1050),
  height: z.number().int().positive().max(10000).default(600),
  unit: z.string().trim().min(1).max(8).default("px"),
  designId: z.string().min(1).max(128).optional(),
});

const elementSchema = z.object({
  id: z.string().min(1).max(128),
  type: z.enum(["text", "image", "rectangle", "circle", "line", "qr", "barcode", "svg", "background"]),
  name: z.string().max(128).optional(), x: z.number().finite(), y: z.number().finite(),
  width: z.number().positive().finite().optional(), height: z.number().positive().finite().optional(),
}).passthrough();
const generatedSchema = z.object({
  version: z.number().int().positive(),
  canvas: z.object({ width: z.number().int().positive(), height: z.number().int().positive(), unit: z.string().max(8).optional(), background: z.string().optional() }).passthrough(),
  elements: z.array(elementSchema).max(100),
}).strict();

function fallbackConfig(type: string, width: number, height: number, unit: string, prompt: string) {
  const escape = prompt.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  return {
    version: 1,
    type,
    canvas: { width, height, unit, background: "#f8fafc" },
    elements: [
      { id: "bg", type: "background", name: "Background", x: 0, y: 0, width, height, fill: "#f8fafc" },
      { id: "accent", type: "rectangle", name: "Accent", x: 0, y: 0, width: Math.round(width * 0.08), height, fill: "#2563eb" },
      { id: "title", type: "text", name: "Judul acara", x: Math.round(width * 0.13), y: Math.round(height * 0.16), width: Math.round(width * 0.65), height: Math.round(height * 0.16), text: "NAMA ACARA", fontSize: Math.round(height * 0.09), fontWeight: 700, color: "#0f172a" },
      { id: "detail", type: "text", name: "Detail", x: Math.round(width * 0.13), y: Math.round(height * 0.38), width: Math.round(width * 0.64), height: Math.round(height * 0.25), text: escape, fontSize: Math.max(14, Math.round(height * 0.04)), color: "#334155" },
      { id: "qr", type: "qr", name: "QR tiket", x: Math.round(width * 0.79), y: Math.round(height * 0.30), width: Math.round(height * 0.32), height: Math.round(height * 0.32), value: "{{ticket.qr}}" },
    ],
  };
}

async function generateWithOllama(prompt: string, type: string, width: number, height: number, unit: string) {
  const base = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL ?? "qwen2.5:3b";
  const response = await fetch(`${base.replace(/\/$/, "")}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(90000),
    body: JSON.stringify({
      model, stream: false, format: "json",
      prompt: `Create an editable ticket design as JSON only. Return object with version:1, canvas:{width:${width},height:${height},unit:${JSON.stringify(unit)},background:"#hex"}, elements:[]. Every element must have id, type (text|image|rectangle|circle|line|qr|barcode|svg|background), x,y, optional width,height. Use only simple design attributes such as text, fill, color, fontSize, fontWeight, radius, value. Keep all bounds inside canvas, max 30 elements, high contrast, no external URLs. The design type is ${type}. User brief: ${prompt}`,
    }),
  });
  if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
  const result = await response.json() as { response?: string };
  if (!result.response) throw new Error("Ollama returned an empty design");
  const parsed = generatedSchema.parse(JSON.parse(result.response));
  const config = { ...parsed, type, canvas: { ...parsed.canvas, width, height, unit } };
  return { model, config: designConfigSchema.parse(config) };
}

export async function generateDesign(body: unknown) {
  const userId = await getCurrentUserId();
  if (!userId) return failure("Authentication required", 401);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return failure("Validasi gagal", 422, parsed.error.flatten());
  const input = parsed.data;
  let model = "local-template-fallback";
  let config: unknown = fallbackConfig(input.type, input.width, input.height, input.unit, input.prompt);
  let aiAvailable = false;
  let warning: string | undefined;
  try {
    const generated = await generateWithOllama(input.prompt, input.type, input.width, input.height, input.unit);
    model = generated.model;
    config = generated.config;
    aiAvailable = true;
  } catch (error) {
    warning = "Ollama tidak tersedia atau hasilnya tidak valid; template dasar dibuat agar tetap dapat diedit. Periksa konfigurasi/model Ollama.";
    console.warn("Ollama design generation failed", error instanceof Error ? error.message : "unknown error");
  }
  if (input.designId) {
    const existing = await prisma.design.findFirst({ where: { id: input.designId, userId }, select: { id: true } });
    if (!existing) return failure("Desain tidak ditemukan", 404);
  }
  await prisma.aiDesignHistory.create({ data: {
    userId, designId: input.designId ?? null, prompt: input.prompt, model,
    status: aiAvailable ? "COMPLETED" : "FALLBACK",
    outputConfig: config as never,
  } });
  return success({ config, model, aiAvailable, ...(warning ? { warning } : {}) }, aiAvailable ? "Desain berhasil dibuat; silakan tinjau dan edit sebelum disimpan" : "Template dasar dibuat; hasil dapat diedit", 200);
}
