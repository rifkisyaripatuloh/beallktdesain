import "server-only";
import { DesignType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { failure, success, validationFailure } from "@/lib/api-response";
import { getCurrentUserId } from "@/lib/auth";
import { designConfigSchema, designTypeSchema } from "@/validators/design";
import { z } from "zod";

const idSchema = z.string().min(1).max(128);
const designInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: designTypeSchema,
  width: z.number().int().positive().max(10000),
  height: z.number().int().positive().max(10000),
  unit: z.string().trim().min(1).max(8).default("px"),
  config: designConfigSchema,
});
const updateSchema = designInputSchema.partial().refine((value) => Object.keys(value).length > 0, "Minimal satu field harus diubah");

function serialize<T extends { id: string; name: string; type: DesignType; width: number; height: number; unit: string; config: Prisma.JsonValue; createdAt: Date; updatedAt: Date }>(design: T) {
  return design;
}

export async function listDesigns(search?: string) {
  const userId = await getCurrentUserId();
  if (!userId) return failure("Authentication required", 401);
  try {
    const designs = await prisma.design.findMany({
      where: { userId, ...(search ? { name: { contains: search.trim() } } : {}) },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return success(designs.map(serialize));
  } catch (error) {
    console.error("Gagal memuat daftar desain:", error);
    return failure("Gagal memuat daftar desain", 500);
  }
}

export async function createDesign(body: unknown) {
  const userId = await getCurrentUserId();
  if (!userId) return failure("Authentication required", 401);
  const parsed = designInputSchema.safeParse(body);
  if (!parsed.success) return validationFailure(parsed.error);
  const { name, type, width, height, unit, config } = parsed.data;
  if (config.type !== type || config.canvas.width !== width || config.canvas.height !== height) return failure("Konfigurasi desain tidak cocok dengan ukuran atau tipe", 422);
  const design = await prisma.design.create({ data: { userId, name, type, width, height, unit, config: config as Prisma.InputJsonValue } });
  return success(serialize(design), "Desain berhasil dibuat", 201);
}

export async function getDesign(id: string) {
  const userId = await getCurrentUserId();
  if (!userId) return failure("Authentication required", 401);
  if (!idSchema.safeParse(id).success) return failure("ID desain tidak valid", 400);
  const design = await prisma.design.findFirst({ where: { id, userId }, include: { sides: true } });
  return design ? success(design) : failure("Desain tidak ditemukan", 404);
}

export async function updateDesign(id: string, body: unknown) {
  const userId = await getCurrentUserId();
  if (!userId) return failure("Authentication required", 401);
  if (!idSchema.safeParse(id).success) return failure("ID desain tidak valid", 400);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return validationFailure(parsed.error);
  const existing = await prisma.design.findFirst({ where: { id, userId } });
  if (!existing) return failure("Desain tidak ditemukan", 404);
  const next = { type: parsed.data.type ?? existing.type, width: parsed.data.width ?? existing.width, height: parsed.data.height ?? existing.height };
  const config = parsed.data.config ?? existing.config;
  if (config) {
    const valid = designConfigSchema.safeParse(config);
    if (!valid.success) return validationFailure(valid.error);
    if (valid.data.type !== next.type || valid.data.canvas.width !== next.width || valid.data.canvas.height !== next.height) return failure("Konfigurasi desain tidak cocok dengan ukuran atau tipe", 422);
  }
  const design = await prisma.design.update({ where: { id }, data: { ...parsed.data, config: parsed.data.config as Prisma.InputJsonValue | undefined } });
  return success(serialize(design), "Desain berhasil diperbarui");
}

export async function deleteDesign(id: string) {
  const userId = await getCurrentUserId();
  if (!userId) return failure("Authentication required", 401);
  if (!idSchema.safeParse(id).success) return failure("ID desain tidak valid", 400);
  const result = await prisma.design.deleteMany({ where: { id, userId } });
  return result.count ? success({ id }, "Desain berhasil dihapus") : failure("Desain tidak ditemukan", 404);
}

