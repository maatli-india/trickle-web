# EC2 deploy — GitHub config

Workflow: `.github/workflows/deploy-ui-ec2.yml` (**UI service — EC2**). Manual only:
Actions → Run workflow → pick branch → tick env(s). The runner runs `next build`, pushes a `linux/arm64` image to
DockerHub, then AWS SSM Run Command starts it on the env's EC2 behind Traefik — the same host pattern as the API
(`transitorder/.github/workflows/deploy-api-SSM.yml`). No SSH, no `.pem` in GitHub.

## Where each env runs

| Env | EC2 | Container | `PUBLIC_HOST` example |
|---|---|---|---|
| dev | dev/qa instance | `trickle-web-dev` | `user-dev.trickle.org.in` |
| qa | dev/qa instance (same as dev) | `trickle-web-qa` | `user-qa.trickle.org.in` |
| prod | prod instance | `trickle-web-prod` | `trickle.org.in` |

Image: `<DOCKERHUB_USERNAME>/trickle-web`, tag `<env>-YYYYMMDD_hhmm.N` (IST). One image per env: the API host is
baked in at build time.

## One-time EC2 setup (per instance)

The box is set up by the `platform-scripts/ec2/` scripts 01–03 (create, configure, run setup via SSM).

1. SSM agent online; instance profile has `AmazonSSMManagedInstanceCore`.
2. Docker + Traefik running (`platform-scripts/ec2/docker-compose.traefik.yml`) on network `traefik-public`;
   security group open on 80/443.
3. Private DockerHub repo → run `docker login` once on the host (the deploy only runs `docker pull`). Docker's free
   plan allows 1 private repo — check your plan before making `trickle-web` private.
4. Free RAM: each container is capped at 256 MB (`CONTAINER_MEMORY`); the websites-only t4g.micro has 1 GiB
   shared by 4 sites.

The UI has no runtime secrets, so no Secrets Manager entry is needed.

## DNS (GoDaddy)

`CNAME` record: `PUBLIC_HOST` → `dkz22qfeufwq0.cloudfront.net` (not an `A` record to the Elastic IP). Hosts:
`user-dev`, `user-qa`, and `trickle.org.in` (prod), all under `trickle.org.in`. CloudFront forwards to origin
`web-origin-nonprod.trickle.org.in` and adds `X-Origin-Verify` to every origin request; Traefik routes only requests
that carry it.

Traefik issues the Let's Encrypt certificate itself: CloudFront forwards `/.well-known/acme-challenge/*` to port 80,
where Traefik's ACME router (not the app router) answers. The first deploy of a host returns 502 for about a minute,
until the certificate is issued.

## GitHub Environments `dev`, `qa`, `prod`

| Type | Key | Required | Example (dev) |
|---|---|---|---|
| Variable | `NEXT_PUBLIC_API_BASE_URL` | yes | `https://api-dev.trickle.org.in/trickle` — no `/v1`, no trailing `/` |
| Variable | `PUBLIC_HOST` | deploy | `user-dev.trickle.org.in` — Traefik `Host` rule, no `https://` |
| Secret | `EC2_INSTANCE_ID` | deploy | `i-0abc…` — dev and qa: the dev/qa instance; prod: the prod instance |

`NEXT_PUBLIC_API_BASE_URL` is the same key as trickle-dash. It is baked in at build time; Google Places goes through
this backend, so the web needs no Google key. Missing required keys fail the run before anything is built.

## Secrets (repo level, or per env to override)

| Key | Notes |
|---|---|
| `DOCKERHUB_USERNAME` | Same account as the API images |
| `DOCKERHUB_TOKEN` | DockerHub access token, Read & Write |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | IAM user allowed `ssm:SendCommand` (the instances + `AWS-RunShellScript`) and `ssm:GetCommandInvocation` — the API workflow's key works |
| `CF_ORIGIN_SECRET` | Needed for deploy. Hex string; must equal the `X-Origin-Verify` value CloudFront sends to the origin |
| `TELEGRAM_BOT_TOKEN` | Same bot as the API deploys |
| `TELEGRAM_CHAT_ID` | Same chat as the API deploys |

## Repo variables (optional)

`SERVICE_NAME` (default `Trickle User portal`) · `NODE_VERSION` (Node.js, default `24` LTS) ·
`TRAEFIK_NETWORK` (default `traefik-public`)

## Inputs

| action | build_tag | What runs |
|---|---|---|
| `deploy` | empty | Build the selected branch with that env's vars → push image → run it on EC2 |
| `deploy` | git commit SHA, e.g. `c290d6e` | Check out that commit, build it fresh with the env's **current** vars → push → run |
| `deploy` | image tag, e.g. `dev-20261110_2005.1` | No build — run that existing image again (seconds) |
| `build` (dev/qa only) | empty / git SHA | Build + push the image only; nothing changes on EC2. Deploy it later by its tag |

Detection rule: `<env>-YYYYMMDD_hhmm.N` = image tag, any other 7–40 hex = git SHA, anything else fails.
Use the full 40-char SHA to avoid ambiguity. An image tag needs `action=deploy` and exactly its own env ticked.

Only the ticked envs run. Allowed: `dev`, `qa`, `dev+qa` (dev first; qa is skipped if dev fails), `prod`.
**PROD always runs alone** and only with `action=deploy`: it builds for prod and deploys (or redeploys a `prod-…` tag).

Each deploy is health-checked inside the container (`GET http://127.0.0.1:3000/` must succeed; 5 s + 10 × 2 s).
On failure the previous image is started again and the run fails. The host keeps the current and previous image per env.

Telegram always shows the branch, SHA and message of the code that went live — on an image-tag rollback that is the
image's own, not the selected branch's latest commit.

## Rollback

1. **By image tag (fast, exact):** copy `Rollback: build_tag=…` from the Telegram message or run summary →
   Run workflow with `action=deploy`, tick **that** env, `build_tag=<tag>`. A `dev-…` tag can't go to prod
   (the dev API host is baked in).
2. **By git SHA:** `build_tag=<sha>` rebuilds old code with today's env vars (use when the API host changed).
