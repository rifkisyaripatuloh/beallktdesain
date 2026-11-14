import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The backend does not use Next.js Cache Components and relies on Prisma's
  // Node.js runtime behavior in API route handlers.
  cacheComponents: false,
  serverExternalPackages: ["@prisma/client", "prisma", "argon2", "sharp", "bullmq", "ioredis", "exceljs", "archiver", "pdf-lib"],
};

export default nextConfig;

