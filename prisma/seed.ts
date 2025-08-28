import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const exists = await prisma.user.findFirst({ where: { email: "example@example.com" } });
  if (!exists) {
    await prisma.user.create({
      data: { email: "example@example.com", name: "First User" },
    });
  }
  console.log("Seed ok ✅");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
