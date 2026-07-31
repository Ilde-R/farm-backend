-- AlterTable: change default scaleFactor
ALTER TABLE "blower_config" ALTER COLUMN "scaleFactor" SET DEFAULT 4549000.0;

-- Update existing rows that still have the old default
UPDATE "blower_config" SET "scaleFactor" = 4549000.0 WHERE "scaleFactor" = 25000.0;
