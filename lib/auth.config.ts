import type { NextAuthConfig } from "next-auth";

// Edge-safe config — no Node.js-only imports (no Prisma, no bcrypt)
// Used by proxy.ts to verify JWTs without touching the database.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
};
