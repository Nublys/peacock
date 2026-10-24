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

# Heap: 75% of the container, not 90. Netty buffers, metaspace and the JVM itself
# all live outside the Java heap; at 90% a busy evening gets the container OOM-killed instead of a GC pause.
# Override with PEACOCK_HEAP_PERCENT (or set an explicit -Xmx in user_jvm_args.txt and leave this alone).
HEAP_PERCENT="${PEACOCK_HEAP_PERCENT:-75.0}"

# Steward (2026-10-22): FTB Chunks' force-loading runs only while a team member is online; keeping land running offline
# is the Steward's paid job (kubejs/server_scripts/steward.js). New worlds get NEVER from defaultconfigs; a world made
# before that still says ALWAYS in its own serverconfig, so it is switched here, once. PEACOCK_FREE_FORCELOAD=1 skips it.
WORLD_DIR="$(grep -E '^level-name=' server.properties 2>/dev/null | cut -d= -f2- | tr -d '\r')"
FTBC_WORLD="${WORLD_DIR:-world}/serverconfig/ftbchunks-world.snbt"
if [ "${PEACOCK_FREE_FORCELOAD:-0}" != "1" ] && [ -f "${FTBC_WORLD}" ] && grep -q 'force_load_mode: "ALWAYS"' "${FTBC_WORLD}"; then
  sed -i 's/force_load_mode: "ALWAYS"/force_load_mode: "NEVER"/' "${FTBC_WORLD}"
  say "FTB Chunks force-loading set to online-only (the Steward keeps land running offline)"
fi

# Seed reroll loop. The capital reroll script that requested rerolls was retired on 2026-10-20 (the capital is now
# a scattered CTOV town that Village Spawn Point finds on any seed), so nothing writes the marker any more and the
# loop runs Java once and exits with its code. Kept for the hang watchdog below and in case a reroll ever returns:
# a kubejs/config/peacock-reroll.json written by a script makes this loop delete the world and start a new seed.
MARKER="kubejs/config/peacock-reroll.json"
COUNT="kubejs/config/peacock-reroll-count.json"
# every reroll decision is also appended here: the console scrolls away, this file does not
REROLL_LOG="logs/peacock-reroll.log"
note() { say "$*"; mkdir -p logs; printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "${REROLL_LOG}"; }

# Hang safety net (2026-10-19): about half of all shutdowns finish saving ("All dimensions are saved", "Finished
# unloading server configs") and then Java never exits — some mod leaves a thread running. The watchdog below waits
# for the shutdown to begin (a reroll marker, or "Stopping server" in this boot's latest.log), gives it
# PEACOCK_HANG_GRACE seconds (120), then writes a thread dump to logs/peacock-hang-<time>.txt (that names the
# thread keeping Java alive), and kills it. Everything is saved by then. A reroll then carries on as normal.
HANG_GRACE="${PEACOCK_HANG_GRACE:-120}"
STARTED="logs/.peacock-started"
watchdog() {
  local pid="$1" since="" dump
  while kill -0 "${pid}" 2>/dev/null; do
    if [ -z "${since}" ]; then
      # latest.log counts only once this boot has rotated it (newer than our start stamp)
      if [ -f "${MARKER}" ] || { [ logs/latest.log -nt "${STARTED}" ] && grep -q "Stopping server" logs/latest.log 2>/dev/null; }; then
        since="$(date +%s)"
      fi
    elif [ $(( $(date +%s) - since )) -ge "${HANG_GRACE}" ]; then
      dump="logs/peacock-hang-$(date '+%Y%m%d-%H%M%S').txt"
      { command -v jcmd >/dev/null 2>&1 && timeout 30 jcmd "${pid}" Thread.print; } > "${dump}" 2>&1 \
        || { command -v jstack >/dev/null 2>&1 && timeout 30 jstack "${pid}"; } > "${dump}" 2>&1 \
        || echo "no jcmd/jstack in this image: the thread dump is in the console output (kill -3)" > "${dump}"
      kill -3 "${pid}" 2>/dev/null   # a second copy of the dump, in the console
      note "!! Java still running ${HANG_GRACE}s after shutdown began (world already saved) — thread dump in ${dump}; killing it"
      sleep 2
      kill -TERM "${pid}" 2>/dev/null; sleep 15
      kill -0 "${pid}" 2>/dev/null && kill -KILL "${pid}" 2>/dev/null
      return 0
    fi
    sleep 5
  done
}

while true; do
  mkdir -p logs; touch "${STARTED}"
  # a marker left by a server that was killed before this loop saw it is stale: it would make the watchdog think a
  # shutdown had begun and kill this boot after HANG_GRACE seconds (2026-10-19 21:48 — the "hang" dump was a boot)
  rm -f "${MARKER}"
  # Java runs in the background so the watchdog can see it; <&0 keeps the panel console connected to it.
  java -Xms128M -XX:MaxRAMPercentage="${HEAP_PERCENT}" ${GC_FLAGS} \
    -Dterminal.jline=false -Dterminal.ansi=true \
    @user_jvm_args.txt "@${ARGS_FILE}" nogui <&0 &
  JPID=$!
  trap 'kill -TERM "${JPID}" 2>/dev/null' TERM INT
  watchdog "${JPID}" &
  WPID=$!
  wait "${JPID}"
  code=$?
  kill "${WPID}" 2>/dev/null; wait "${WPID}" 2>/dev/null
  trap - TERM INT
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
