-- AlterTable
ALTER TABLE "RfcLicense" ADD COLUMN     "name" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3);
