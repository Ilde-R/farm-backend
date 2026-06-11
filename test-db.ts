import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  console.log("=== TENANTS ===");
  console.log(JSON.stringify(tenants, null, 2));

  const configs = await prisma.blowerConfig.findMany();
  console.log("\n=== BLOWER CONFIGS ===");
  console.log(JSON.stringify(configs, null, 2));

  const readings = await prisma.pressureReading.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log("\n=== LATEST PRESSURE READINGS ===");
  console.log(JSON.stringify(readings, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
