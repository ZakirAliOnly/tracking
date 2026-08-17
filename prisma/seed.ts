import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const ADMIN_EMAIL = "admin@trackfleet.com";
  const ADMIN_PASSWORD = "Admin@123";
  const ORG_NAME = "Real Tracker";

  let org = await prisma.organization.findFirst({
    where: { name: ORG_NAME },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: { name: ORG_NAME },
    });
    console.log(`Created organization: ${ORG_NAME}`);
  } else {
    console.log(`Organization already exists: ${ORG_NAME}`);
  }

  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (!existing) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await prisma.user.create({
      data: {
        orgId: org.id,
        fullName: "Admin",
        email: ADMIN_EMAIL,
        passwordHash,
        role: "owner",
      },
    });
    console.log(`Created admin: ${ADMIN_EMAIL}`);
  } else {
    console.log(`Admin already exists: ${ADMIN_EMAIL}`);
  }

  console.log("\nSeed complete.");
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
