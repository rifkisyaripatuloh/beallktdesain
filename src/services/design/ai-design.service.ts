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
  const bg = type === "INVITATION" ? "#fff7ed" : type === "MEMBERSHIP_CARD" ? "#111827" : type === "ID_CARD" ? "#eff6ff" : "#f8fafc";
  const accent = type === "INVITATION" ? "#b45309" : type === "MEMBERSHIP_CARD" ? "#f59e0b" : type === "PARKING_TICKET" ? "#059669" : "#2563eb";
  const ink = type === "MEMBERSHIP_CARD" ? "#f8fafc" : "#0f172a";
  const pad = Math.round(width * 0.08);
  const qrSize = Math.max(56, Math.round(Math.min(width, height) * 0.23));
  const qrX = Math.max(pad, width - qrSize - pad);
  const textWidth = Math.max(80, qrX - pad * 1.5);
  const heading = type === "INVITATION" ? "UNDANGAN" : type === "MEMBERSHIP_CARD" ? "MEMBER PASS" : type === "ID_CARD" ? "IDENTITAS" : type === "PARKING_TICKET" ? "PARKIR" : type === "ENTRY_TICKET" ? "ADMIT ONE" : "NAMA ACARA";
  const qrY = Math.max(pad, Math.round(height * 0.45));
  return {
    version: 1,
    type,
    canvas: { width, height, unit, background: bg },
    elements: [
      { id: "bg", type: "background", name: "Latar", x: 0, y: 0, width, height, fill: bg },
      { id: "top-accent", type: "rectangle", name: "Aksen atas", x: 0, y: 0, width, height: Math.max(8, Math.round(height * 0.035)), fill: accent },
      { id: "side-accent", type: "rectangle", name: "Aksen samping", x: 0, y: Math.round(height * 0.035), width: Math.max(8, Math.round(width * 0.018)), height: Math.round(height * 0.93), fill: accent },
      { id: "category", type: "text", name: "Kategori tiket", x: pad, y: Math.round(height * 0.12), width: textWidth, height: Math.round(height * 0.09), text: heading, fontSize: Math.max(14, Math.round(height * 0.055)), fontWeight: 700, color: accent, fontFamily: "DM Sans" },
      { id: "title", type: "text", name: "Judul tiket", x: pad, y: Math.round(height * 0.25), width: textWidth, height: Math.round(height * 0.15), text: "NAMA ACARA", fontSize: Math.max(20, Math.round(height * 0.095)), fontWeight: 700, color: ink, fontFamily: "DM Sans" },
      { id: "details", type: "text", name: "Brief acara", x: pad, y: Math.round(height * 0.44), width: textWidth, height: Math.round(height * 0.21), text: escape.slice(0, 260), fontSize: Math.max(12, Math.round(height * 0.038)), color: ink, fontFamily: "DM Sans" },
      { id: "date", type: "text", name: "Tanggal dan lokasi", x: pad, y: Math.round(height * 0.72), width: textWidth, height: Math.round(height * 0.08), text: "TANGGAL Â· LOKASI", fontSize: Math.max(11, Math.round(height * 0.035)), fontWeight: 600, color: accent, fontFamily: "DM Sans" },
      { id: "ticket-no", type: "text", name: "Nomor tiket", x: pad, y: Math.round(height * 0.84), width: textWidth, height: Math.round(height * 0.07), text: "NO. TIKET  Â·  TCK-0001", fontSize: Math.max(10, Math.round(height * 0.03)), color: ink, fontFamily: "DM Sans" },
      { id: "qr", type: "qr", name: "QR verifikasi", x: qrX, y: qrY, width: qrSize, height: qrSize, value: "{{ticket.qr}}", color: ink, qrBackground: bg },
      { id: "qr-label", type: "text", name: "Petunjuk QR", x: qrX, y: Math.min(height - pad, qrY + qrSize + 8), width: qrSize, height: Math.max(18, Math.round(height * 0.05)), text: "SCAN MASUK", fontSize: Math.max(9, Math.round(height * 0.024)), fontWeight: 700, color: accent, fontFamily: "DM Sans" },
    ],
  };
}

async function generateWithOllama(prompt: string, type: string, width: number, height: number, unit: string) {
  const configuredBase = process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434";
  const base = configuredBase.replace(/\/+$/, "");
  const model = process.env.OLLAMA_MODEL?.trim() || "qwen2.5:1.5b";
  let endpoint: URL;
  try {
    endpoint = new URL(`${base}/api/generate`);
    if (!["http:", "https:"].includes(endpoint.protocol)) throw new Error("URL must use HTTP or HTTPS");
  } catch (error) {
    throw new Error(`OLLAMA_BASE_URL tidak valid (${configuredBase}): ${error instanceof Error ? error.message : "URL error"}`);
  }
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(180000),
      body: JSON.stringify({ model, stream: false, format: "json", prompt: `Create a complete editable ticket artboard in strict JSON. Type: ${type}, canvas ${width}x${height} ${unit}. Use editable text, shapes and static inline SVG only, maximum 30 objects, positions within canvas, no scripts or external URLs. Brief: ${prompt}. Output JSON {version:1,canvas:{width:${width},height:${height},unit:${JSON.stringify(unit)},background:"#hex"},elements:[...]}.` }),
    });
  } catch (error) {
    const cause = error instanceof Error ? error.cause : undefined;
    const code = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "";
    const hint = code === "ECONNREFUSED" ? `Ollama menolak koneksi di ${endpoint.origin}. Jalankan Ollama di komputer/server backend atau ubah OLLAMA_BASE_URL.`
      : code === "ENOTFOUND" || code === "EAI_AGAIN" ? `Host Ollama tidak ditemukan (${endpoint.hostname}). Periksa OLLAMA_BASE_URL.`
      : code === "ETIMEDOUT" || (error instanceof DOMException && error.name === "TimeoutError") ? `Ollama timeout di ${endpoint.origin}; pastikan service dan model ${model} siap.`
      : `Tidak dapat menghubungi Ollama di ${endpoint.origin}. Pastikan endpoint dapat diakses dari backend.`;
    throw new Error(`${hint}${code ? ` (${code})` : ""}`);
  }
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error(`Ollama ${endpoint.origin} merespons HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  const result = await response.json() as { response?: string };
  if (!result.response) throw new Error("Ollama mengembalikan desain kosong");
  let output: unknown;
  try { output = JSON.parse(result.response); }
  catch { throw new Error("Ollama merespons, tetapi output bukan JSON valid"); }
  const parsed = generatedSchema.parse(output);
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
    const details = error instanceof Error ? error.message : 'Penyebab tidak diketahui';
    warning = `${details} Template lokal ditampilkan agar Anda tetap dapat melanjutkan.`;
    console.warn(`[design-ai] LLM tidak tersedia: ${details}`);
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
