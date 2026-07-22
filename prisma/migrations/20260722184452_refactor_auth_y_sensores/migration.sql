/*
  Warnings:

  - The primary key for the `pressure_reading` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `blowerId` on the `pressure_reading` table. All the data in the column will be lost.
  - The `id` column on the `pressure_reading` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "pressure_reading" DROP CONSTRAINT "pressure_reading_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_tenantId_fkey";

-- AlterTable
ALTER TABLE "pressure_reading" DROP CONSTRAINT "pressure_reading_pkey",
DROP COLUMN "blowerId",
ADD COLUMN     "blowerConfigId" UUID,
ADD COLUMN     "isAlert" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "id",
ADD COLUMN     "id" BIGSERIAL NOT NULL,
ADD CONSTRAINT "pressure_reading_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP COLUMN "password",
ALTER COLUMN "tenantId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "credentials" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blower_config" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "blowerId" TEXT NOT NULL,
    "name" TEXT,
    "currentThreshold" DOUBLE PRECISION NOT NULL DEFAULT 2.0,

    CONSTRAINT "blower_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credentials_userId_key" ON "credentials"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "blower_config_tenantId_blowerId_key" ON "blower_config"("tenantId", "blowerId");

-- CreateIndex
CREATE INDEX "pressure_reading_tenantId_idx" ON "pressure_reading"("tenantId");

-- CreateIndex
CREATE INDEX "pressure_reading_blowerConfigId_idx" ON "pressure_reading"("blowerConfigId");

-- CreateIndex
CREATE INDEX "pressure_reading_createdAt_idx" ON "pressure_reading"("createdAt");

-- CreateIndex
CREATE INDEX "pressure_reading_tenantId_isAlert_idx" ON "pressure_reading"("tenantId", "isAlert");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blower_config" ADD CONSTRAINT "blower_config_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pressure_reading" ADD CONSTRAINT "pressure_reading_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pressure_reading" ADD CONSTRAINT "pressure_reading_blowerConfigId_fkey" FOREIGN KEY ("blowerConfigId") REFERENCES "blower_config"("id") ON DELETE SET NULL ON UPDATE CASCADE;
