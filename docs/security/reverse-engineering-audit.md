# Reverse-engineering and information-disclosure audit

Repo: `trickle-web` (Next.js, public GitHub, deployed on Netlify free tier per the request).
Date: 2026-10-29. The JS bundle and the repo are the same attack surface: view-source, the Netlify deploy artifact, or REA on the chunk files. Secret values are not copied here.

Severity: Critical = credential in the bundle or git. High = a check that exists only in the browser, or an open proxy onto a privileged API. Medium = hostnames, tokens in `localStorage`, tokens in URLs. Low = doc/comments.

## 1. Secrets and credentials

No API secret, Mongo URI, AWS key, PayU salt, or PEM is committed.

- `GOOGLE_PLACES_API_KEY` is read only on the server: `src/app/api/places/autocomplete/route.ts:5`, `src/app/api/places/details/route.ts:5`, `src/app/api/places/reverse-geocode/route.ts:6`. It is not `NEXT_PUBLIC_`. That is the right split. The key never appears in this repo; it lives in the host env. If the Netlify env marks it `NEXT_PUBLIC_` by mistake, the next build will put it in the browser bundle. Do not.
- PayU: `src/lib/payu.ts` posts `order.merchantKey` and a server-signed `hash`. The merchant key is a public PayU field. The salt is not in this repo. Keep it that way.
- `git log -S AKIA` matches `src/assets/localLocations.json` (place-name data containing those letters), not an AWS key. Same for `9833369` / `fc0d2b1`.

## 2. Client-side business logic

No pricing, discount, or authorization decision is enforced only in the browser.

- Prices are rendered from API fields (`pricePerPackage`, payable amounts). `src/lib/home-constants.ts:82-86` is mock marketing data (names and sample prices), not the ledger.
- `src/app/requests/new/page.tsx` sorts by the price the API returned. Sorting in the client does not change what can be purchased.
- Auth flags are "is there a token in `localStorage`", not "is this user allowed to do X".

The bundle still teaches the API. That is section 4.

## 3. Source maps and debug artifacts

- `next.config.ts` does not set `productionBrowserSourceMaps`. Next.js defaults that to off, so the Netlify publish does not include browser source maps unless the Netlify UI or a build plugin turns them on. There is no committed `.map`.
- `src/app/requests/[id]/page.tsx:538` gates a block on `process.env.NODE_ENV !== "production"`. Confirm a production Netlify build sets `NODE_ENV=production` (Next does this for `next build`). If someone runs `next dev` on the public site, that block and React dev overlays ship.
- No `.pdb` (not a native app).

Fix: in the Netlify UI, confirm "publish source maps" is off. Do not set `productionBrowserSourceMaps: true`.

## 4. API surface

### W1. Hardcoded dev API origin — Medium

- `src/lib/config.ts:4` and `next.config.ts:5` both default `NEXT_PUBLIC_API_BASE_URL` to `https://api.trickle-dev.maatli.com/trickle`. `NEXT_PUBLIC_` values are inlined into the client bundle.
- Discover: view-source, the Network tab, or strings on the Netlify `_next/static` chunks. A production deploy that forgot the env var silently talks to dev.
- Fix: fail the build when `NEXT_PUBLIC_API_BASE_URL` is unset. Do not default a public site at a dev host (that host is also where the Go API allows mock payment confirm if `APP_ENV=dev`).

### W2. Catch-all proxy to the API — Medium

- `src/app/api/v1/[...path]/route.ts:6-40` forwards every method and almost every header (including `Authorization`) to `siteConfig.apiBaseUrl`, and returns the upstream body.
- `next.config.ts:4-9` also rewrites `/api/:path*` at the backend. App routes win over `afterFiles` rewrites, so `/api/v1/*` is the route handler and `/api/places/*` stays local. Any other `/api/...` path is proxied by the rewrite.
- This is not an auth bypass: the Go service still checks tokens. It does give the website origin as a second front door, it forwards verbose upstream errors, and the 502 body (`route.ts:30`) tells the caller to check `NEXT_PUBLIC_API_BASE_URL`.
- Discover: read the repo, then `curl` the Netlify origin `/api/v1/docs/swagger.yaml` if the rewrite/proxy path reaches the public docs route. (The catch-all prepends `/v1/`, so Swagger is `/docs` on the API host, not under this proxy. The API host itself serves it; see the transitorder audit.)
- Fix: delete the catch-all. Call the API from the browser only for routes you have named, or proxy a fixed allowlist. Do not forward arbitrary paths.

### W3. Access token in `localStorage` and in the WebSocket URL — Medium

- `src/services/auth.ts:4-5` and `:32-35` store access and refresh tokens in `localStorage` (`trickle.web.accessToken`, `trickle.web.refreshToken`). Any XSS on this origin reads them. A public repo makes XSS easier to hunt.
- `src/app/requests/[id]/chat/page.tsx:79` puts the short-lived chat token in `?access_token=`. It will be in proxy logs, browser history, and any extension that watches WebSocket URLs. The token is minted per connection (`src/services/chat.ts:22`), which shortens the window.
- Discover: DevTools Application tab, or a traffic capture.
- Fix: httpOnly `Secure` `SameSite` cookies for the refresh token (the access token can stay in memory). Put the chat token in a header or a one-shot subprotocol, not the query string. The server already accepts a short token; the leak is the transport.

### W4. Profile and PII depend on the API — High, owned by the API

The web client calls the same `GET /v1/users/{id}` as the app. The authorization hole is in transitorder (`GetUserByID` ownership check commented out). This repo cannot fix that. Do not display phone or email returned for another user.

## 5. Repo history

19 commits. No `.env` was ever added. No `ghp_`, PEM, Mongo URI, or MSG91 key. Firebase/AWS-looking `AKIA` hits are the location JSON (section 1).

## 6. Netlify

No `netlify.toml`, no `netlify/functions`. Env vars are whatever the Netlify UI has. This audit cannot see that UI.

What the repo will do if the UI is empty:

- API origin falls through to the dev host (W1).
- Places routes fail closed without `GOOGLE_PLACES_API_KEY` (no key shipped).

Fix: set `NEXT_PUBLIC_API_BASE_URL` in Netlify to the production API only, scoped so it is not a secret (it will be public). Keep `GOOGLE_PLACES_API_KEY` as a server env, not `NEXT_PUBLIC_`. Turn off deploy source maps. The free-tier deploy is a public URL; assume every client chunk is downloaded.

## 7. Backend binary

Not this repo. The browser never receives the Go binary. It receives the API's JSON, which is enough to learn the route list (W2).

## 8. Mobile

Not this repo.
