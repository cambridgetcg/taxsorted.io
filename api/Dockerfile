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
# Only the reviewed static corpora are needed at runtime; research notes and
# collection tooling stay out of the image.
COPY research/uk/tax-system/data/ research/uk/tax-system/data/
COPY research/uk/tax-industry/data/ research/uk/tax-industry/data/
COPY research/uk/charities/data/ research/uk/charities/data/
COPY research/uk/public-funding/data/ research/uk/public-funding/data/
COPY research/uk/politics/data/ research/uk/politics/data/
COPY research/uk/case-commons/data/ research/uk/case-commons/data/

USER node
EXPOSE 8080
CMD ["./node_modules/.bin/tsx", "api/src/index.ts"]
