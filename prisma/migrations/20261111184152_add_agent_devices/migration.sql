-- AlterTable
ALTER TABLE "DownloadRequest" ADD COLUMN     "assignedDeviceId" TEXT,
ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "leaseExpiresAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AgentDevice" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "platform" VARCHAR(30) NOT NULL,
    "agentVersion" VARCHAR(30),
    "tokenHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentPairingCode" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentPairingCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentDevice_tokenHash_key" ON "AgentDevice"("tokenHash");

-- CreateIndex
CREATE INDEX "AgentDevice_licenseId_isActive_idx" ON "AgentDevice"("licenseId", "isActive");

-- CreateIndex
CREATE INDEX "AgentDevice_lastSeenAt_idx" ON "AgentDevice"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgentPairingCode_codeHash_key" ON "AgentPairingCode"("codeHash");

-- CreateIndex
CREATE INDEX "AgentPairingCode_licenseId_expiresAt_idx" ON "AgentPairingCode"("licenseId", "expiresAt");

-- CreateIndex
CREATE INDEX "DownloadRequest_assignedDeviceId_status_idx" ON "DownloadRequest"("assignedDeviceId", "status");

-- CreateIndex
CREATE INDEX "DownloadRequest_status_leaseExpiresAt_idx" ON "DownloadRequest"("status", "leaseExpiresAt");

-- AddForeignKey
ALTER TABLE "AgentDevice" ADD CONSTRAINT "AgentDevice_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "RfcLicense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentPairingCode" ADD CONSTRAINT "AgentPairingCode_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "RfcLicense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadRequest" ADD CONSTRAINT "DownloadRequest_assignedDeviceId_fkey" FOREIGN KEY ("assignedDeviceId") REFERENCES "AgentDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
