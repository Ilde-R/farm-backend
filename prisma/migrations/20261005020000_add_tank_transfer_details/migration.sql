ALTER TABLE "tanks_movements"
RENAME COLUMN "tankId" TO "sourceTankId";

ALTER TABLE "tanks_movements"
RENAME CONSTRAINT "tanks_movements_tankId_fkey"
TO "tanks_movements_sourceTankId_fkey";

ALTER TABLE "tanks_movements"
ADD COLUMN "destinationTankId" UUID,
ADD COLUMN "destinationBatchId" UUID,
ADD COLUMN "movementDate" TIMESTAMPTZ(3);

UPDATE "tanks_movements"
SET "movementDate" = "createdAt";

ALTER TABLE "tanks_movements"
ALTER COLUMN "movementDate" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "movementDate" SET NOT NULL;

ALTER TABLE "tanks_movements"
ADD CONSTRAINT "tanks_movements_destinationTankId_fkey"
FOREIGN KEY ("destinationTankId") REFERENCES "tanks"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tanks_movements"
ADD CONSTRAINT "tanks_movements_destinationBatchId_fkey"
FOREIGN KEY ("destinationBatchId") REFERENCES "batches"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
