#!/usr/bin/env bash
# Peacock dedicated server: sync the pack from main, apply server overrides, launch Forge.
#
# First time:  ./server/start.sh --install     (installs Forge 47.4.16 into ./server/run)
# Every start: ./server/start.sh
#
# Env overrides:
#   PEACOCK_PACK_URL   pack.toml URL (default: main on GitHub)
#   PEACOCK_RUN_DIR    server directory (default: <repo>/server/run)
#   PEACOCK_SNAPSHOT=1 tar the world before syncing (pre-update safety net)
set -euo pipefail

FORGE_VERSION="1.20.1-47.4.16"
PACK_URL="${PEACOCK_PACK_URL:-https://raw.githubusercontent.com/Nublys/peacock/main/pack/pack.toml}"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="${PEACOCK_RUN_DIR:-$REPO_DIR/server/run}"
BOOTSTRAP_URL="https://github.com/packwiz/packwiz-installer-bootstrap/releases/latest/download/packwiz-installer-bootstrap.jar"

log() { printf '\033[1;36m[peacock]\033[0m %s\n' "$*"; }

install_forge() {
  mkdir -p "$RUN_DIR"; cd "$RUN_DIR"
  log "downloading Forge $FORGE_VERSION installer"
  curl -fL -o forge-installer.jar \
    "https://maven.minecraftforge.net/net/minecraftforge/forge/$FORGE_VERSION/forge-$FORGE_VERSION-installer.jar"
  java -jar forge-installer.jar --installServer
  rm -f forge-installer.jar forge-installer.jar.log
  echo "eula=true" > eula.txt
  [ -f server.properties ] || cp "$REPO_DIR/server/server.properties" server.properties
  cp "$REPO_DIR/server/user_jvm_args.txt" user_jvm_args.txt
  log "Forge installed in $RUN_DIR"
}

sync_pack() {
  cd "$RUN_DIR"
  [ -f packwiz-installer-bootstrap.jar ] || curl -fL -o packwiz-installer-bootstrap.jar "$BOOTSTRAP_URL"
  log "syncing pack (server side) from $PACK_URL"
  java -jar packwiz-installer-bootstrap.jar -g -s server "$PACK_URL"
  # server-specific config that the pack cannot express per side
  log "applying server overrides"
  cp -r "$REPO_DIR/server/overrides/." "$RUN_DIR/"
}

snapshot_world() {
  cd "$RUN_DIR"
  local level; level="$(grep -E '^level-name=' server.properties | cut -d= -f2)"; level="${level:-world}"
  [ -d "$level" ] || return 0
  mkdir -p "$RUN_DIR/snapshots"
  local out="$RUN_DIR/snapshots/${level}-$(date +%Y%m%d-%H%M%S).tar.zst"
  log "snapshot -> $out"
  tar --zstd -cf "$out" "$level"
}

case "${1:-}" in
  --install) install_forge; sync_pack; log "done — run ./server/start.sh to launch"; exit 0 ;;
  "") ;;
  *) echo "usage: $0 [--install]" >&2; exit 2 ;;
esac

[ -f "$RUN_DIR/run.sh" ] || { echo "no Forge install in $RUN_DIR — run: $0 --install" >&2; exit 1; }
[ "${PEACOCK_SNAPSHOT:-0}" = "1" ] && snapshot_world
sync_pack
cd "$RUN_DIR"
log "starting Forge $FORGE_VERSION"
exec ./run.sh nogui
