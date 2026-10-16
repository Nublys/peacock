#!/usr/bin/env sh
# Copy a hardware profile's config files over the pack defaults in a Prism instance.
# Usage: tools/apply-profile.sh <mac|linux> /path/to/instance/minecraft
set -eu
profile="${1:?profile: mac|linux}"
inst="${2:?path to the instance's minecraft folder}"
src="$(cd "$(dirname "$0")/.." && pwd)/profiles/$profile"
[ -d "$src" ] || { echo "no such profile: $profile" >&2; exit 1; }
cp -v "$src"/DistantHorizons.toml "$inst/config/DistantHorizons.toml"
echo "applied profile '$profile' (DistantHorizons.toml is marked preserve, so updates will not overwrite it)"
