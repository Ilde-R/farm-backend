-- AlterTable: change default saveIntervalSeconds to 3 hours
ALTER TABLE "blower_config" ALTER COLUMN "saveIntervalSeconds" SET DEFAULT 10800;

-- Update existing rows that still have the old default (300)
UPDATE "blower_config" SET "saveIntervalSeconds" = 10800 WHERE "saveIntervalSeconds" = 300;
