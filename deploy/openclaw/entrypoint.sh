#!/bin/sh
set -eu

: "${OPENCLAW_GATEWAY_TOKEN:?OPENCLAW_GATEWAY_TOKEN is required}"
: "${CLAWNOTE_BASE_URL:?CLAWNOTE_BASE_URL is required}"
: "${CLAWNOTE_AGENT_TOKEN:?CLAWNOTE_AGENT_TOKEN is required}"

openclaw --version | grep -q '2026\.7\.1' || {
  echo "Refusing to start: expected OpenClaw 2026.7.1" >&2
  exit 78
}

plugin_hash="$(sha256sum /opt/clawnote-openclaw-plugin.tgz | cut -d ' ' -f 1)"
installed_hash="$(cat /home/node/.openclaw/clawnote-plugin.sha256 2>/dev/null || true)"
if [ "$plugin_hash" != "$installed_hash" ]; then
  openclaw plugins install /opt/clawnote-openclaw-plugin.tgz --force
  printf '%s\n' "$plugin_hash" > /home/node/.openclaw/clawnote-plugin.sha256
fi

openclaw config set gateway.http.endpoints.responses.enabled true
exec openclaw gateway --bind lan --port 18789
