-- CreateEnum
CREATE TYPE "TanksStatus" AS ENUM ('isActive', 'empty', 'maintenance');

-- CreateEnum
CREATE TYPE "BatchesStatus" AS ENUM ('isActive', 'harvested');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('sale', 'mortality', 'transfer');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenantId" UUID,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blower_config" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "blowerId" TEXT NOT NULL,
    "name" TEXT,
    "currentThreshold" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "firmwareVersion" TEXT,
    "wifiRssi" INTEGER,
    "uptimeMs" INTEGER,
    "freeHeap" INTEGER,
    "readIntervalMs" INTEGER DEFAULT 1000,
    "scaleFactor" DOUBLE PRECISION DEFAULT 250000.0,
    "saveIntervalSeconds" INTEGER NOT NULL DEFAULT 10800,
    "lastSaveAt" TIMESTAMPTZ(3),
    "lastAlertState" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "blower_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_key" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "blowerConfigId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_key_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pressure_reading" (
    "id" BIGSERIAL NOT NULL,
    "tenantId" UUID NOT NULL,
    "blowerConfigId" UUID,
    "psi" DOUBLE PRECISION NOT NULL,
    "isAlert" BOOLEAN NOT NULL DEFAULT false,
    "deviceTs" BIGINT,
    "deviceTime" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pressure_reading_pkey" PRIMARY KEY ("id")
);

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

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_userId_key" ON "credentials"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "blower_config_tenantId_blowerId_key" ON "blower_config"("tenantId", "blowerId");

-- CreateIndex
CREATE UNIQUE INDEX "device_key_key_key" ON "device_key"("key");

-- CreateIndex
CREATE INDEX "device_key_key_idx" ON "device_key"("key");

-- CreateIndex
CREATE INDEX "device_key_blowerConfigId_idx" ON "device_key"("blowerConfigId");

-- CreateIndex
CREATE INDEX "pressure_reading_tenantId_idx" ON "pressure_reading"("tenantId");

-- CreateIndex
CREATE INDEX "pressure_reading_blowerConfigId_idx" ON "pressure_reading"("blowerConfigId");

-- CreateIndex
CREATE INDEX "pressure_reading_createdAt_idx" ON "pressure_reading"("createdAt");

-- CreateIndex
CREATE INDEX "pressure_reading_tenantId_isAlert_idx" ON "pressure_reading"("tenantId", "isAlert");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blower_config" ADD CONSTRAINT "blower_config_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_key" ADD CONSTRAINT "device_key_blowerConfigId_fkey" FOREIGN KEY ("blowerConfigId") REFERENCES "blower_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pressure_reading" ADD CONSTRAINT "pressure_reading_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pressure_reading" ADD CONSTRAINT "pressure_reading_blowerConfigId_fkey" FOREIGN KEY ("blowerConfigId") REFERENCES "blower_config"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tanks" ADD CONSTRAINT "tanks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "tanks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tanks_movements" ADD CONSTRAINT "tanks_movements_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tanks_movements" ADD CONSTRAINT "tanks_movements_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "tanks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
