
import { redirect } from "next/navigation";
import prisma from "@/utils/prisma";
import { getCurrentLicense } from "@/utils/auth/session";
import DownloadsClient from "@/components/downloads/DownloadsClient";

export const instant = false;

export default async function DownloadsPage() {
  const license = await getCurrentLicense();

  if (!license) {
    redirect("/login");
  }

  if (license.isAdmin) {
    redirect("/admin");
  }

  const [requests, activeDevice] = await Promise.all([
    prisma.downloadRequest.findMany({
      where: {
        licenseId: license.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      select: {
        id: true,
        requestType: true,
        downloadFormat: true,
        startDate: true,
        endDate: true,
        status: true,
        documentsDownloaded: true,
        errorMessage: true,
        createdAt: true,
        satRequestId: true,
        attempts: true,
      },
    }),

    prisma.agentDevice.findFirst({
      where: {
        licenseId: license.id,
        isActive: true,
        revokedAt: null,
      },
      select: {
        id: true,
      },
    }),
  ]);

  const formattedRequests = requests.map((request) => ({
    ...request,
    startDate: request.startDate.toISOString().slice(0, 10),
    endDate: request.endDate.toISOString().slice(0, 10),
    createdAt: request.createdAt.toISOString(),
    satRequestId: request.satRequestId,
    attempts: request.attempts,
  }));

  return (
    <DownloadsClient
      requests={formattedRequests}
      hasActiveAgent={Boolean(activeDevice)}
    />
  );
}
