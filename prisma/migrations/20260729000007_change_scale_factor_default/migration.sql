-- AlterTable: change default scaleFactor
ALTER TABLE "blower_config" ALTER COLUMN "scaleFactor" SET DEFAULT 250000.0;

-- Update existing rows
UPDATE "blower_config" SET "scaleFactor" = 250000.0;
