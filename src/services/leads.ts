import { apiRequest } from "@/services/api-client";

export type LeadPayload = {
  name: string;
  message: string;
  email?: string;
  phone?: string;
  company?: string;
  category?: string;
  // Honeypot — always sent, always empty for a real visitor.
  website?: string;
};

export const submitLead = (payload: LeadPayload) => apiRequest("/v1/leads", { method: "POST", body: JSON.stringify(payload) });
