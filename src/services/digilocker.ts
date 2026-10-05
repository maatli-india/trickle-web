import { apiRequest } from "@/services/api-client";

// POST /v1/users/me/digilocker/start (see transitorder's digilocker.go) —
// mints a PKCE authorize URL and an opaque single-use state server-side.
// Unlike the mobile app (which hands the URL to the system browser via
// Linking.openURL), the web client just navigates the current tab there —
// DigiLocker's own site, not an embedded iframe, so this still honors the
// "never an embedded user-agent" requirement from RFC 8252 the mobile
// client follows.
export type DigilockerAuthStart = { authorizeUrl?: string };

export const startDigilockerVerification = () =>
  apiRequest<DigilockerAuthStart>("/v1/users/me/digilocker/start", {
    method: "POST",
    body: JSON.stringify({ client: "web" }),
  });
