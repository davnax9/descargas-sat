-- CreateEnum
CREATE TYPE "DownloadFormat" AS ENUM ('XML', 'METADATA');

-- AlterTable
ALTER TABLE "DownloadRequest" ADD COLUMN     "downloadFormat" "DownloadFormat" NOT NULL DEFAULT 'XML';
