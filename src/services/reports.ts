import { apiRequest } from "@/services/api-client";

export type ReportPayload = { category: string; description: string; reportedType?: string; reportedId?: string; urgent?: boolean };

export const createReport = (payload: ReportPayload) => apiRequest("/v1/reports", { method: "POST", body: JSON.stringify(payload) });
