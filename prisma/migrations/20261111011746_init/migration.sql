-- CreateEnum
CREATE TYPE "DownloadType" AS ENUM ('ISSUED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "DownloadStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('PENDING', 'DOWNLOADED', 'FAILED');

-- CreateTable
CREATE TABLE "RfcLicense" (
    "id" TEXT NOT NULL,
    "rfc" VARCHAR(13) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RfcLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DownloadRequest" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "requestType" "DownloadType" NOT NULL,
    "satRequestId" TEXT,
    "status" "DownloadStatus" NOT NULL DEFAULT 'PENDING',
    "documentsDownloaded" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DownloadRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DownloadPackage" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "satPackageId" TEXT NOT NULL,
    "status" "PackageStatus" NOT NULL DEFAULT 'PENDING',
    "documentCount" INTEGER NOT NULL DEFAULT 0,
    "downloadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DownloadPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RfcLicense_rfc_key" ON "RfcLicense"("rfc");

-- CreateIndex
CREATE INDEX "RfcLicense_isActive_expiresAt_idx" ON "RfcLicense"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "DownloadRequest_licenseId_createdAt_idx" ON "DownloadRequest"("licenseId", "createdAt");

-- CreateIndex
CREATE INDEX "DownloadRequest_status_idx" ON "DownloadRequest"("status");

-- CreateIndex
CREATE INDEX "DownloadRequest_satRequestId_idx" ON "DownloadRequest"("satRequestId");

-- CreateIndex
CREATE INDEX "DownloadPackage_requestId_idx" ON "DownloadPackage"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "DownloadPackage_requestId_satPackageId_key" ON "DownloadPackage"("requestId", "satPackageId");

-- AddForeignKey
ALTER TABLE "DownloadRequest" ADD CONSTRAINT "DownloadRequest_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "RfcLicense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadPackage" ADD CONSTRAINT "DownloadPackage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DownloadRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
