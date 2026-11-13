/*
  Warnings:

  - Added the required column `passwordHash` to the `RfcLicense` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RfcLicense" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ALTER COLUMN "expiresAt" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "RfcLicense_isAdmin_idx" ON "RfcLicense"("isAdmin");
