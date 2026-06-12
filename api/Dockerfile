# Build context is the repo root: the api needs the engine workspace.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY engine/package.json engine/
COPY api/package.json api/
RUN npm ci --omit=dev --workspace api

COPY engine/ engine/
COPY api/ api/

USER node
EXPOSE 8080
CMD ["./node_modules/.bin/tsx", "api/src/index.ts"]
