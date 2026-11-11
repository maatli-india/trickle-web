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
CMD ["node", "server.js"]
