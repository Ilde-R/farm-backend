-- CreateTable
CREATE TABLE "device_key" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "blowerConfigId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_key_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_key_key_key" ON "device_key"("key");

-- CreateIndex
CREATE INDEX "device_key_key_idx" ON "device_key"("key");

-- AddForeignKey
ALTER TABLE "device_key" ADD CONSTRAINT "device_key_blowerConfigId_fkey" FOREIGN KEY ("blowerConfigId") REFERENCES "blower_config"("id") ON DELETE CASCADE ON UPDATE CASCADE;
