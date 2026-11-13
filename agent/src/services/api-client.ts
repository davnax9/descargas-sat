import { getRemoteConfig } from "../config/remote.js";
import { getAgentCredentials } from "../security/credentials.js";

export class AgentApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AgentApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const credentials = getAgentCredentials();

  if (!credentials) {
    throw new Error("El agente no está vinculado.");
  }

  const { baseUrl } = getRemoteConfig();

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${credentials.token}`,
      ...options.headers,
    },
    signal: options.signal ?? AbortSignal.timeout(20000),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AgentApiError(
      result?.error || "Error de comunicación con CFDI Local.",
      response.status
    );
  }

  return result as T;
}

export type AgentJob = {
  id: string;
  startDate: string;
  endDate: string;
  requestType: "ISSUED" | "RECEIVED";
  downloadFormat: "XML" | "METADATA";
  attempts: number;
  resumed?: boolean;
  satRequestId?: string | null;
};

export type AgentJobResult = {
  status: "COMPLETED" | "PARTIAL" | "FAILED";
  documentsDownloaded: number;
  satRequestId?: string | null;
  errorMessage?: string | null;
  packages?: {
    satPackageId: string;
    status: "DOWNLOADED" | "FAILED" | "PENDING";
    documentCount: number;
  }[];
};

export async function getNextJob() {
  const result = await request<{
    job?: AgentJob | null;
  }>("/api/agent/jobs", {
    method: "GET",
  });

  return result.job ?? null;
}

export async function sendHeartbeat(jobId: string) {
  return request<{
    success: boolean;
    renewed: boolean;
    leaseExpiresAt: string | null;
  }>("/api/agent/heartbeat", {
    method: "POST",
    body: JSON.stringify({ jobId }),
  });
}

export async function reportJobResult(
  jobId: string,
  result: AgentJobResult
) {
  return request(
    `/api/agent/jobs/${jobId}/result`,
    {
      method: "POST",
      body: JSON.stringify(result),
    }
  );
}

export async function saveSatRequestId(
  jobId: string,
  satRequestId: string
) {
  return request<{
    success: boolean;
    jobId: string;
    satRequestId: string;
  }>(
    `/api/agent/jobs/${jobId}/progress`,
    {
      method: "POST",
      body: JSON.stringify({ satRequestId }),
    }
  );
}