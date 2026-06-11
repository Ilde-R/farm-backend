require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('./node_modules/.prisma/client');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
