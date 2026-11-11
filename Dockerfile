# Runtime image only. deploy-ui-ec2.yml runs `next build` (output: "standalone") on the x64 runner and
# this arm64 image just copies the result, so no build step runs under emulation.
FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --chown=node:node .next/standalone ./
COPY --chown=node:node .next/static ./.next/static
COPY --chown=node:node public ./public

USER node
EXPOSE 3000
# One image for every env (like the API image): CI builds with NEXT_PUBLIC_API_BASE_URL set to this placeholder,
# which Next inlines into the server and browser bundles; it is swapped for the deploy's API_BASE_URL here.
# Keep in sync with deploy-ui-ec2.yml.
ENV API_BASE_URL_PLACEHOLDER=https://api-base-url.placeholder.invalid
CMD ["sh", "-c", "set -e; : \"${API_BASE_URL:?API_BASE_URL is required}\"; grep -rlF \"$API_BASE_URL_PLACEHOLDER\" .next | xargs -r sed -i \"s#$API_BASE_URL_PLACEHOLDER#${API_BASE_URL%/}#g\"; exec node server.js"]
