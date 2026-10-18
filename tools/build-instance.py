#!/usr/bin/env python3
"""Build the importable Prism Launcher instance: dist/Peacock-Prism.zip.

Add Instance → Import → this file (or its raw GitHub URL) gives a ready instance: Minecraft 1.20.1,
Forge 47.4.16, 6 GB, the G1 flags, and the pre-launch command that runs peacock/launch.jar — which
syncs the pack from main and applies the player's hardware profile on every launch. The zip holds no
mods; the first launch downloads them. The only file of ours inside is launch.jar itself.

Usage: python3 tools/build-instance.py   (run by tools/build-launch.sh after a launch.jar rebuild)
"""
from __future__ import annotations

import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "dist" / "Peacock-Prism.zip"
PACK_URL = "https://raw.githubusercontent.com/Nublys/peacock/main/pack/pack.toml"

# instance.cfg is a Qt INI file: a value with quotes inside must be one quoted string with \" escapes,
# or the parser drops the spaces between the pieces ("java-jar …launch.jarhttps://…", seen 2026-10-18).
INSTANCE_CFG = f"""[General]
ConfigVersion=1.3
InstanceType=OneSix
name=Peacock
iconKey=flame
AutomaticJava=true
OverrideMemory=true
MinMemAlloc=512
MaxMemAlloc=6144
OverrideJavaArgs=true
JvmArgs=-XX:+UseG1GC -XX:MaxGCPauseMillis=50
OverrideCommands=true
PreLaunchCommand="\\"$INST_JAVA\\" -jar \\"$INST_MC_DIR/peacock/launch.jar\\" {PACK_URL}"
notes=Peacock — the pack syncs itself from GitHub on every launch (peacock/launch.jar). Pick a graphics tier in-game with /peacock profile <tier>. Guide: https://github.com/Nublys/peacock
"""

MMC_PACK = {
    "formatVersion": 1,
    "components": [
        {"uid": "org.lwjgl3", "version": "3.3.1", "dependencyOnly": True},
        {"uid": "net.minecraft", "version": "1.20.1", "important": True},
        {"uid": "net.minecraftforge", "version": "47.4.16"},
    ],
}


def main() -> None:
    jar = ROOT / "pack/peacock/launch.jar"
    if not jar.exists():
        raise SystemExit("pack/peacock/launch.jar missing — run tools/build-launch.sh first")
    OUT.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        info = lambda name: zipfile.ZipInfo(name, date_time=(2020, 1, 1, 0, 0, 0))   # reproducible
        z.writestr(info("Peacock/instance.cfg"), INSTANCE_CFG)
        z.writestr(info("Peacock/mmc-pack.json"), json.dumps(MMC_PACK, indent=4) + "\n")
        z.writestr(info("Peacock/.minecraft/peacock/launch.jar"), jar.read_bytes())
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
