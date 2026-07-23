-- AlterTable
ALTER TABLE "blower_config" ADD COLUMN     "firmwareVersion" TEXT,
ADD COLUMN     "freeHeap" INTEGER,
ADD COLUMN     "readIntervalMs" INTEGER DEFAULT 1000,
ADD COLUMN     "scaleFactor" DOUBLE PRECISION DEFAULT 25000.0,
ADD COLUMN     "uptimeMs" INTEGER,
ADD COLUMN     "wifiRssi" INTEGER;
