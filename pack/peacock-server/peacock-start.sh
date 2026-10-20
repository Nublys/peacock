#!/bin/bash
# Peacock — Pterodactyl start script. The egg's startup command is exactly: bash peacock-start.sh
#
# Why a script: the yolks Java image runs the startup command with `exec env ${PARSED}` after an
# `eval echo` expansion. A command containing `&&` is *executed by that eval* inside a $(...)
# capture — the server runs with its console swallowed and the sync step reduced to an echo.
# One script, with Forge exec'd at the end, keeps stdin/stdout attached to the server.
#
# Egg variables arrive as environment variables: PACK_URL, MC_VERSION, FORGE_VERSION.
# A copy of this file ships inside the pack (pack/peacock-server/peacock-start.sh) and is
# applied on every sync, so edits in the repo reach the server on its next restart.

cd /home/container || exit 1

PACK_URL="${PACK_URL:-https://raw.githubusercontent.com/Nublys/peacock/main/pack/pack.toml}"
MC_VERSION="${MC_VERSION:-1.20.1}"
FORGE_VERSION="${FORGE_VERSION:-47.4.16}"
ARGS_FILE="libraries/net/minecraftforge/forge/${MC_VERSION}-${FORGE_VERSION}/unix_args.txt"

say() { printf '\033[1;36m[peacock]\033[0m %s\n' "$*"; }

say "syncing pack from ${PACK_URL}"
if java -jar packwiz-installer-bootstrap.jar -g -s server "${PACK_URL}"; then
  say "sync ok"
else
  say "!! PACK SYNC FAILED — starting with the files already on disk. Clients may see mod mismatches."
fi

if [ -d peacock-server ]; then
  say "applying server overrides from peacock-server/"
  cp -r peacock-server/. .
fi

if [ ! -f "${ARGS_FILE}" ]; then
  say "!! ${ARGS_FILE} not found — Forge ${MC_VERSION}-${FORGE_VERSION} is not installed. Reinstall the server."
  exit 1
fi

say "starting Forge ${MC_VERSION}-${FORGE_VERSION}"
# Aikar's G1 flags: shorter, more predictable GC pauses on a busy modded server.
GC_FLAGS="-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions
  -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40
  -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20 -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4
  -XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5
  -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1"

# Heap: 75% of the container, not 90. Netty buffers, Valkyrien Skies' physics, metaspace and the JVM itself
# all live outside the Java heap; at 90% a busy evening gets the container OOM-killed instead of a GC pause.
# Override with PEACOCK_HEAP_PERCENT (or set an explicit -Xmx in user_jvm_args.txt and leave this alone).
HEAP_PERCENT="${PEACOCK_HEAP_PERCENT:-75.0}"

# Seed reroll (kubejs/server_scripts/capital_reroll.js): on a brand-new world with no capital the server writes
# kubejs/config/peacock-reroll.json and stops itself; this loop deletes that world and starts again on a new
# random seed. Java runs in the foreground (not exec) so the console stays attached; with no marker the script
# exits with the server's own exit code, exactly as before.
MARKER="kubejs/config/peacock-reroll.json"
COUNT="kubejs/config/peacock-reroll-count.json"
# every reroll decision is also appended here: the console scrolls away, this file does not
REROLL_LOG="logs/peacock-reroll.log"
note() { say "$*"; mkdir -p logs; printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "${REROLL_LOG}"; }
while true; do
  java -Xms128M -XX:MaxRAMPercentage="${HEAP_PERCENT}" ${GC_FLAGS} \
    -Dterminal.jline=false -Dterminal.ansi=true \
    @user_jvm_args.txt "@${ARGS_FILE}" nogui
  code=$?
  if [ ! -f "${MARKER}" ]; then
    note "server stopped (exit ${code}), no reroll requested"
    exit "${code}"
  fi
  LEVEL="$(grep -E '^level-name=' server.properties 2>/dev/null | cut -d= -f2- | tr -d '\r')"
  LEVEL="${LEVEL:-world}"
  ATTEMPT="$(grep -oE '"attempt"[[:space:]]*:[[:space:]]*[0-9]+' "${MARKER}" | grep -oE '[0-9]+$')"
  rm -f "${MARKER}"
  # last guard, independent of the script's: never delete a world anyone has played in
  if [ -n "$(ls -A "${LEVEL}/playerdata" 2>/dev/null)" ]; then
    note "!! reroll ${ATTEMPT:-?} requested but ${LEVEL}/playerdata is not empty — keeping the world: $(ls -A "${LEVEL}/playerdata" | head -5 | tr '\n' ' ')"
    exit "${code}"
  fi
  if [ ! -f "${LEVEL}/level.dat" ]; then
    note "!! reroll ${ATTEMPT:-?} requested but ${LEVEL}/level.dat is missing — not deleting anything"
    exit "${code}"
  fi
  note "reroll ${ATTEMPT:-?}: this seed does not suit the capital — deleting ${LEVEL} and starting on a new seed"
  rm -rf "${LEVEL}"
  sed -i 's/^level-seed=.*/level-seed=/' server.properties
  printf '{"tries": %s}\n' "${ATTEMPT:-1}" > "${COUNT}"
done
