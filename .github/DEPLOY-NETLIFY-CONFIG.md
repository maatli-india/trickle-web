# Netlify deploy — GitHub config

Workflow: `.github/workflows/deploy-ui-netlify.yml` (**UI service — Netlify**). Manual only:
Actions → Run workflow → pick branch → tick env(s). Netlify CLI deploy; the site is **not** linked to GitHub.

## One-time Netlify setup (per env)

Create one Netlify site per env (dev / qa / prod) with *Deploy manually*. Copy **Project configuration → Project ID**
into `NETLIFY_SITE_ID` below. The Netlify site needs **no** environment variables — the workflow supplies
every value from GitHub on each deploy. Leave Netlify's env empty so nothing overrides GitHub.

## GitHub Environments `dev`, `qa`, `prod`

| Type | Key | Required | Example (dev) |
|---|---|---|---|
| Variable | `NETLIFY_SITE_ID` | yes | `1a2b3c4d-…` (Netlify Project ID) |
| Variable | `NEXT_PUBLIC_API_BASE_URL` | yes | `https://api-dev.trickle.org.in/trickle` — no `/v1`, no trailing `/` |

Same key as trickle-dash. It is baked in at build time; Google Places goes through this backend, so the web
needs no Google key. Missing required keys fail the run before anything is built.

## Secrets (repo level, or per env to override)

| Key | Notes |
|---|---|
| `NETLIFY_AUTH_TOKEN` | Netlify → User settings → Applications → Personal access token |
| `TELEGRAM_BOT_TOKEN` | Same bot as the API deploys |
| `TELEGRAM_CHAT_ID` | Same chat as the API deploys |

## Repo variables (optional)

`SERVICE_NAME` (default `Trickle Web`) · `NODE_VERSION` (Node.js, default `24` LTS) · `NETLIFY_PUBLISH_DIR` (`.next`)

## Inputs

| action | build_tag | What runs |
|---|---|---|
| `deploy` | empty | Build the selected branch with that env's vars → `netlify deploy --prod` |
| `deploy` | git commit SHA, e.g. `c290d6e` | Check out that commit, build it fresh with the env's **current** vars → new deploy |
| `deploy` | Netlify deploy ID, e.g. `66f1c2ab3d4e5f6a7b8c9d0e` | No build — Netlify re-publishes that exact earlier deploy (seconds) |
| `build` (dev/qa only) | empty / git SHA | `npm ci` + `npm run build` only; nothing reaches Netlify |

Detection rule: exactly 24 hex chars = Netlify deploy ID, any other 7–40 hex = git SHA, anything else fails.
Use the full 40-char SHA to avoid ambiguity. A deploy ID needs `action=deploy` and exactly one env.

Telegram always shows the branch, SHA and message of the code that went live — on a deploy-ID rollback that is
the restored deploy's own, not the selected branch's latest commit.

Only the ticked envs run. Allowed: `dev`, `qa`, `dev+qa` (dev first; qa is skipped if dev fails), `prod`.
**PROD always runs alone** and only with `action=deploy`: it builds for prod and deploys (or restores a prod deploy ID).
Each deploy is smoke-checked (`GET /` on the new
deploy URL must return 200 after redirects). On failure the previously published deploy is restored and the run fails.

## Rollback

1. **By deploy ID (fast, exact):** copy `Netlify deploy ID` from the Telegram message or run summary →
   Run workflow with `action=deploy`, tick **one** env, `build_tag=<id>`. IDs are per site: a dev ID won't work on prod.
2. **By git SHA:** `build_tag=<sha>` rebuilds old code with today's env vars (use when the API host changed).
3. **Netlify UI fallback:** site → Deploys → pick a deploy → *Publish deploy*.
