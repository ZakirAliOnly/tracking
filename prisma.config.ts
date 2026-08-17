import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// The Prisma CLI does not read .env.local on its own — lib/prisma.ts loads it
// the same way so both paths share one source of truth.
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
