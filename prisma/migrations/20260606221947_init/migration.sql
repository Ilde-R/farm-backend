-- CreateTable
CREATE TABLE "pressure_reading" (
    "id" TEXT NOT NULL,
    "blowerId" TEXT,
    "psi" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pressure_reading_pkey" PRIMARY KEY ("id")
);
