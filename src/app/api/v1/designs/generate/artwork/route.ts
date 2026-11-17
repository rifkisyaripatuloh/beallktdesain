import { NextRequest } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { failure, success } from "@/lib/api-response";
import { z } from "zod";

export const runtime = "nodejs";

const artworkSchema = z.object({ prompt: z.string().trim().min(8).max(1500) });

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return failure("Authentication required", 401);
  let body: unknown;
  try { body = await request.json(); } catch { return failure("JSON tidak valid", 400); }
  const parsed = artworkSchema.safeParse(body);
  if (!parsed.success) return failure("Validasi gagal", 422, parsed.error.flatten());

  const base = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_IMAGE_MODEL;
  if (!model) return failure("Image generation belum dikonfigurasi. Set OLLAMA_IMAGE_MODEL ke model image-generation Ollama yang sudah terpasang.", 503);

  let response: Response;
  try {
    response = await fetch(`${base.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(120000),
      body: JSON.stringify({ model, prompt: parsed.data.prompt, stream: false }),
    });
  } catch (error) {
    const cause = error instanceof Error ? error.cause : undefined;
    const code = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : '';
    const explanation = code === 'ECONNREFUSED'
      ? `Ollama menolak koneksi di ${base}. Jalankan Ollama di backend.`
      : `Image model di ${base} tidak dapat dijangkau${code ? ` (${code})` : ''}. Periksa OLLAMA_BASE_URL.`;
    console.warn(`[design-artwork] ${explanation}`);
    return failure(explanation, 503);
  }
  if (!response.ok) return failure(`Image model merespons HTTP ${response.status}`, 502);
  const result = await response.json() as { images?: string[] };
  const encoded = result.images?.[0];
  if (!encoded || encoded.length > 12_000_000) return failure("Model tidak menghasilkan gambar valid (batas 9 MB).", 502);
  return success({ src: `data:image/png;base64,${encoded}`, model }, "Ilustrasi tiket berhasil dibuat");
}

