import { apiRequest, apiRequestWithAuth } from "@/services/api-client";
import { AVATAR_CACHE_PREFIX, getWebUserId } from "@/services/auth";

export type UploadTarget = {
  fileId: string;
  uploadUrl: string;
  expiresAt?: string;
  expiresInSeconds?: number;
  requiredHeaders?: Record<string, string>;
};

export type UploadUrlResult = { error?: string; uploadUrl?: UploadTarget };

export type FileStatus = {
  fileId: string;
  status: "PENDING" | "READY" | "FAILED";
  downloadUrl?: string;
};

// A signup JWT (validate_otp's token.accessToken when isNewUser is true)
// authenticates file routes the same way an access token does, but must not
// carry X-Device-ID and isn't stored in the normal session — so it's passed
// in explicitly instead of being read from localStorage like a normal call.
const fileRequest = <T,>(path: string, signupToken: string | undefined, init?: RequestInit) =>
  signupToken ? apiRequestWithAuth<T>(path, signupToken, init) : apiRequest<T>(path, init);

export const getProfilePicUploadUrl = (fileContentType: string, signupToken?: string) =>
  fileRequest<UploadTarget>(
    `/v1/file/upload-url?fileType=profile_pic&fileContentType=${encodeURIComponent(fileContentType)}`,
    signupToken,
  );

export const getFileStatus = (fileId: string, signupToken?: string) =>
  fileRequest<FileStatus>(`/v1/file/${encodeURIComponent(fileId)}/status`, signupToken);

// PUTs the raw bytes to a minted uploadUrl. Every requiredHeaders entry must
// be set and the Trickle bearer token must never be sent on this request.
export const uploadFileBytes = async (target: UploadTarget, file: File) => {
  const response = await fetch(target.uploadUrl, {
    method: "PUT",
    headers: { ...(target.requiredHeaders || {}) },
    body: file,
  });
  if (!response.ok) throw new Error(`Photo upload failed (status ${response.status}).`);
};

export const pollFileStatus = async (
  fileId: string,
  { signupToken, intervalMs = 1500, timeoutMs = 45000 }: { signupToken?: string; intervalMs?: number; timeoutMs?: number } = {},
): Promise<FileStatus> => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const status = await getFileStatus(fileId, signupToken);
    if (status.status !== "PENDING") return status;
    if (Date.now() >= deadline) throw new Error("Timed out waiting for the photo to finish processing.");
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
};

// Mints, uploads, and polls a single profile picture to READY/FAILED,
// minting one fresh URL and retrying once if the first PUT fails (the
// URL may have expired).
export const uploadProfilePic = async (file: File, signupToken?: string): Promise<FileStatus> => {
  let target = await getProfilePicUploadUrl(file.type, signupToken);
  try {
    await uploadFileBytes(target, file);
  } catch {
    target = await getProfilePicUploadUrl(file.type, signupToken);
    await uploadFileBytes(target, file);
  }
  return pollFileStatus(target.fileId, { signupToken });
};

export const deleteMyProfilePic = () => apiRequest<{ message?: string } | null>("/v1/users/me/profile-pic", { method: "DELETE" });

// ---------------------------------------------------------------------------
// Chat images — groupId is the chat id (== the match id — see transitorder's
// chat design). The backend checks the caller may open this chat before
// minting (chatOrchestrator.AuthorizeChatFileUpload, wired into
// GenerateUploadURL for fileType 'chat_file'), so no extra check is needed
// here.
// ---------------------------------------------------------------------------

export const getChatFileUploadUrl = (chatId: string, fileContentType: string) =>
  apiRequest<UploadTarget>(
    `/v1/file/upload-url?fileType=chat_file&fileContentType=${encodeURIComponent(fileContentType)}&groupId=${encodeURIComponent(chatId)}`,
  );

// Mints, uploads, and polls one chat image to READY/FAILED, minting one
// fresh URL and retrying once if the first PUT fails (the URL may have
// expired) — same pattern as uploadProfilePic.
export const uploadChatImage = async (chatId: string, file: File): Promise<FileStatus> => {
  let target = await getChatFileUploadUrl(chatId, file.type);
  try {
    await uploadFileBytes(target, file);
  } catch {
    target = await getChatFileUploadUrl(chatId, file.type);
    await uploadFileBytes(target, file);
  }
  return pollFileStatus(target.fileId);
};

// GET /api/chat-file/:chatId/:fileId — same server-side redirect resolution
// as fetchAvatarUrl/fetchParcelPhotoUrl (see that route for why).
export const fetchChatFileUrl = async (chatId: string, fileId: string): Promise<string | null> => {
  if (typeof window === "undefined") return null;
  try {
    const result = await apiRequest<{ url?: string }>(`/chat-file/${encodeURIComponent(chatId)}/${encodeURIComponent(fileId)}`);
    return result?.url || null;
  } catch {
    return null;
  }
};

type CachedAvatar = { url: string | null; expiresAt: number };

// Re-fetch this long before the presigned URL expires, so an <img> never gets a dead link.
const AVATAR_EXPIRY_MARGIN_MS = 60_000;
const AVATAR_FALLBACK_TTL_MS = 10 * 60_000;
const avatarRequests = new Map<string, Promise<string | null>>();

// The signed-in user's own picture survives tabs and reloads (localStorage, cleared on logout);
// other users' pictures only live for this tab (sessionStorage).
const avatarStorage = (userId: string) => (userId === getWebUserId() ? localStorage : sessionStorage);

// The URL is an S3 presigned GET; it stops working at X-Amz-Date + X-Amz-Expires (minus the margin).
export const presignedExpiry = (url: string): number => {
  try {
    const params = new URL(url).searchParams;
    const signedAt = params.get("X-Amz-Date")?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
    const lifetimeSeconds = Number(params.get("X-Amz-Expires"));
    if (!signedAt || !Number.isFinite(lifetimeSeconds)) return Date.now() + AVATAR_FALLBACK_TTL_MS;
    const [, year, month, day, hour, minute, second] = signedAt.map(Number);
    return Date.UTC(year, month - 1, day, hour, minute, second) + lifetimeSeconds * 1000 - AVATAR_EXPIRY_MARGIN_MS;
  } catch {
    return Date.now() + AVATAR_FALLBACK_TTL_MS;
  }
};

const readCachedAvatar = (userId: string): CachedAvatar | null => {
  try {
    const cached = JSON.parse(avatarStorage(userId).getItem(`${AVATAR_CACHE_PREFIX}${userId}`) || "null") as CachedAvatar | null;
    return cached && cached.expiresAt > Date.now() ? cached : null;
  } catch {
    return null;
  }
};

// GET /users/{userId}/profile-pic-url is public but requires X-Device-ID
// and redirects to the real image — a plain <img src> can't set that
// header, and browser fetch() can't read a redirect's Location, so this
// goes through our own /api/avatar/[userId] route, which resolves the
// redirect server-side and hands back the final URL as JSON.
//
// Cached until the presigned URL expires ("no picture" until the cache is
// invalidated); `fresh` skips the cache. Concurrent calls share one request.
export const fetchAvatarUrl = async (userId: string, { fresh = false }: { fresh?: boolean } = {}): Promise<string | null> => {
  if (typeof window === "undefined" || !userId) return null;
  if (!fresh) {
    const cached = readCachedAvatar(userId);
    if (cached) return cached.url;
  }
  const pending = avatarRequests.get(userId);
  if (pending) return pending;
  const request = (async () => {
    try {
      const result = await apiRequest<{ url?: string }>(`/avatar/${encodeURIComponent(userId)}`);
      const url = result?.url || null;
      const entry: CachedAvatar = { url, expiresAt: url ? presignedExpiry(url) : Number.MAX_SAFE_INTEGER };
      avatarStorage(userId).setItem(`${AVATAR_CACHE_PREFIX}${userId}`, JSON.stringify(entry));
      return url;
    } catch (error) {
      if ((error as { status?: number })?.status === 404) {
        const entry: CachedAvatar = { url: null, expiresAt: Number.MAX_SAFE_INTEGER };
        avatarStorage(userId).setItem(`${AVATAR_CACHE_PREFIX}${userId}`, JSON.stringify(entry));
      }
      return null;
    } finally {
      avatarRequests.delete(userId);
    }
  })();
  avatarRequests.set(userId, request);
  return request;
};

// Lets every mounted <Avatar> of this user (page header included) re-read the cache after an upload/delete.
export const AVATAR_CHANGED_EVENT = "trickle:avatar-changed";

export const notifyAvatarChanged = (userId: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string>(AVATAR_CHANGED_EVENT, { detail: userId }));
};

export const invalidateAvatarCache = (userId?: string) => {
  if (typeof window === "undefined") return;
  if (userId) {
    localStorage.removeItem(`${AVATAR_CACHE_PREFIX}${userId}`);
    sessionStorage.removeItem(`${AVATAR_CACHE_PREFIX}${userId}`);
  } else {
    Object.keys(sessionStorage).filter((k) => k.startsWith(AVATAR_CACHE_PREFIX)).forEach((k) => sessionStorage.removeItem(k));
  }
};

// The picture can stay 404 for a few seconds after an upload reaches READY
// (or after create-user during signup) — poll the display URL itself a few
// times before giving up.
export const waitForAvatarUrl = async (userId: string, attempts = 5, delayMs = 1200): Promise<string | null> => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const url = await fetchAvatarUrl(userId, { fresh: true });
    if (url) return url;
    if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return null;
};
