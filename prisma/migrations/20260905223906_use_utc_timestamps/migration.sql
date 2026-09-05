-- CreateEnum
CREATE TYPE "TanksStatus" AS ENUM ('isActive', 'empty', 'maintenance');

-- CreateEnum
CREATE TYPE "BatchesStatus" AS ENUM ('isActive', 'harvested');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('sale', 'mortality', 'transfer');

-- AlterTable
ALTER TABLE "blower_config" ALTER COLUMN "uptimeMs" SET DATA TYPE BIGINT,
ALTER COLUMN "lastSaveAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "device_key" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "pressure_reading" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "sessions" ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "lastUsedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "tenants" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "tanks" (
    "id" UUID NOT NULL,
    "tenantId" UUID,
    "tankNumber" INTEGER NOT NULL,
    "tankStatus" "TanksStatus" NOT NULL DEFAULT 'empty',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tanks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" UUID NOT NULL,
    "tankId" UUID,
    "stockingDate" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "initialQuantity" INTEGER NOT NULL,
    "currentQuantity" INTEGER NOT NULL,
    "harvestedDate" TIMESTAMPTZ(3),
    "batchesStatus" "BatchesStatus" NOT NULL DEFAULT 'isActive',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tanks_movements" (
    "id" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "tankId" UUID NOT NULL,
    "movementType" "MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tanks_movements_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tanks" ADD CONSTRAINT "tanks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "tanks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tanks_movements" ADD CONSTRAINT "tanks_movements_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tanks_movements" ADD CONSTRAINT "tanks_movements_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "tanks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
