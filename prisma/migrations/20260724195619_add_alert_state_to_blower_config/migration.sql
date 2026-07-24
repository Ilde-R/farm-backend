-- AlterTable
ALTER TABLE "blower_config" ADD COLUMN     "lastAlertState" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastSaveAt" TIMESTAMP(3);
