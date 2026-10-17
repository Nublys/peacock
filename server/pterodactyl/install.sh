#!/bin/bash
# Peacock egg — installation script (runs once in the install container, with Java 17).
# Installs Forge, the packwiz bootstrap, server.properties defaults and the pack's JVM args,
# then performs the first server-side sync so the server is ready on first start.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq curl jq >/dev/null

mkdir -p /mnt/server && cd /mnt/server

MC_VERSION="${MC_VERSION:-1.20.1}"
FORGE_VERSION="${FORGE_VERSION:-47.4.16}"
PACK_URL="${PACK_URL:-https://raw.githubusercontent.com/Nublys/peacock/main/pack/pack.toml}"
REPO_RAW="${PACK_URL%/pack/pack.toml}"

echo "== Forge ${MC_VERSION}-${FORGE_VERSION}"
curl -fsSL -o forge-installer.jar \
  "https://maven.minecraftforge.net/net/minecraftforge/forge/${MC_VERSION}-${FORGE_VERSION}/forge-${MC_VERSION}-${FORGE_VERSION}-installer.jar"
java -jar forge-installer.jar --installServer >/dev/null
rm -f forge-installer.jar forge-installer.jar.log run.bat

echo "== pack defaults"
[ -f server.properties ] || curl -fsSL -o server.properties "${REPO_RAW}/server/server.properties"
curl -fsSL -o user_jvm_args.txt "${REPO_RAW}/server/user_jvm_args.txt"
curl -fsSL -o peacock-start.sh "${REPO_RAW}/server/pterodactyl/peacock-start.sh"
echo "eula=true" > eula.txt

echo "== packwiz bootstrap + first sync"
curl -fsSL -o packwiz-installer-bootstrap.jar \
  "https://github.com/packwiz/packwiz-installer-bootstrap/releases/latest/download/packwiz-installer-bootstrap.jar"
java -jar packwiz-installer-bootstrap.jar -g -s server "${PACK_URL}"
cp -r peacock-server/. .

echo "== done"
