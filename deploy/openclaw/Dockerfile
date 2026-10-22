FROM node:24-bookworm-slim AS plugin-builder
WORKDIR /plugin
COPY packages/openclaw-clawnote/package*.json ./
RUN npm install
COPY packages/openclaw-clawnote ./
RUN npm run check && npm run build && npm pack --pack-destination /out

# OpenClaw 2026.7.1 multi-platform manifest, pinned on 2026-07-27.
FROM ghcr.io/openclaw/openclaw:2026.7.1@sha256:6a31d44b2944e7adcd2b582bf6fb463111264ebca97a0201795b799135bd102c
USER root
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=plugin-builder /out/*.tgz /opt/clawnote-openclaw-plugin.tgz
COPY deploy/openclaw/entrypoint.sh /opt/clawnote-entrypoint.sh
RUN chmod 0755 /opt/clawnote-entrypoint.sh
USER node
ENTRYPOINT ["/opt/clawnote-entrypoint.sh"]
