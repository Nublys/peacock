#!/usr/bin/env python3
"""Generate pack/peacock/profiles/<tier>/ from the pack defaults.

Profiles are named by hardware tier, never by OS. Each folder holds *.keys files -- one setting per
line in the target file's own syntax -- applied per setting by peacock/launch.jar:
  config/DistantHorizons.toml.keys     radius, threads, transparency, quality (TOML `key = value`)
  config/oculus.properties.keys        shader pack + on/off
  config/embeddium-options.json.keys   weather/leaves quality, vignette ("key": value lines)
  shaderpacks/<pack>.txt.keys          Iris per-pack options = one of Complementary's own presets
  options.txt.keys                     render distance etc. (`key:value`)
Per-setting patching is required because mods rewrite their config files on every start.

Run after changing pack/config/DistantHorizons.toml, the shader pack version, or TIERS below:
    python3 tools/gen-profiles.py && (cd pack && packwiz refresh)
The Complementary zip is fetched from the URL in pack/shaderpacks/complementary-reimagined.pw.toml
so the preset option lists always match the shipped version.
"""
import io, re, sys, urllib.request, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "pack"
OUT = PACK / "peacock" / "profiles"

CR_ZIP = re.search(r'filename = "([^"]+)"', (PACK / "shaderpacks/complementary-reimagined.pw.toml").read_text()).group(1)
CR_URL = re.search(r'url = "([^"]+)"', (PACK / "shaderpacks/complementary-reimagined.pw.toml").read_text()).group(1)
CR_NAME = CR_ZIP[:-4]
EUPHORIA = f"{CR_NAME} + EuphoriaPatches_1.10.5"   # folder Euphoria Patcher generates client-side

# Resource packs shipped in pack/resourcepacks/, enabled in every tier (last = highest priority). Must match the
# `filename` fields of the .pw.toml files and config/defaultoptions/options.txt.
RESOURCE_PACKS = '["vanilla","mod_resources","file/Better-Leaves-9.6.zip","file/EnhancedBossBars-1.6.zip","file/xalis-enchanted-books-1.0.0-beta.2.zip","file/xalis-potions-1.2.0.zip","file/LowOnFire-26.3.zip","file/FreshAnimations_v1.10.4.zip"]'

#          tier          shaders  pack        preset      DH radius  DH transp.  threads  DH quality  options.txt keys
TIERS = {
    "potato":      dict(shaders=False, pack=CR_ZIP,  preset="POTATO",  dh=64,  transp="DISABLED", threads=1, quality="LOW", ssao=False, emb=("FAST","FAST","false"),
                        fresh_animations=False,
                        options={"renderDistance": "6", "simulationDistance": "6", "graphicsMode": "0", "particles": "2",
                                 "entityShadows": "false", "biomeBlendRadius": "1", "mipmapLevels": "2", "entityDistanceScaling": "0.5",
                                 "renderClouds": "false"}),
    "low":         dict(shaders=True,  pack=CR_ZIP,  preset="POTATO",  dh=128, transp="FAKE",     threads=1, quality="LOW", ssao=False, emb=("FAST","FAST","false"),
                        options={"renderDistance": "6", "simulationDistance": "6", "graphicsMode": "1", "particles": "1",
                                 "entityShadows": "false", "biomeBlendRadius": "2"}),
    "medium":      dict(shaders=True,  pack=CR_ZIP,  preset="MEDIUM",  dh=192, transp="FAKE",     threads=2, quality="MEDIUM", ssao=True, emb=("DEFAULT","DEFAULT","true"),
                        options={"renderDistance": "8", "simulationDistance": "8", "graphicsMode": "1", "particles": "0",
                                 "entityShadows": "true", "biomeBlendRadius": "3"}),
    "high":        dict(shaders=True,  pack=EUPHORIA, preset="HIGH",   dh=256, transp="COMPLETE", threads=4, quality="MEDIUM", ssao=True, emb=("FANCY","FANCY","true"),
                        options={"renderDistance": "10", "simulationDistance": "8", "graphicsMode": "2", "particles": "0",
                                 "entityShadows": "true", "biomeBlendRadius": "5"}),
    "ultra":       dict(shaders=True,  pack=EUPHORIA, preset="ULTRA",  dh=384, transp="COMPLETE", threads=6, quality="HIGH", ssao=True, emb=("FANCY","FANCY","true"),
                        options={"renderDistance": "12", "simulationDistance": "10", "graphicsMode": "2", "particles": "0",
                                 "entityShadows": "true", "biomeBlendRadius": "7"}),
}

# Values earlier pack versions wrote as defaults. launch.jar treats a setting that still equals one of these as
# "not the player's own" and updates it, so a changed default reaches existing installs. Append, never remove.
PREVIOUS_DEFAULTS = {
    "options.txt.keys": [
        'resourcePacks:["vanilla","mod_resources","file/FreshAnimations_v1.10.4.zip"]',
    ],
}

# Settings every tier writes into options.txt (keys the launcher adds when missing): keybinds that
# would otherwise collide. FTB Chunks' large map defaults to M (Map Atlases); its claim manager goes on J.
COMMON_KEYS = {
    "key_key.ftbchunks.map": "key.keyboard.unknown",
    "key_key.ftbchunks.claim_manager": "key.keyboard.j",
    "key_key.ftbchunks.toggle_minimap": "key.keyboard.unknown",
    "key_key.ftbchunks.add_waypoint": "key.keyboard.unknown",
    "key_key.ftbchunks.waypoint_manager": "key.keyboard.unknown",
}

def load_presets():
    data = urllib.request.urlopen(CR_URL, timeout=60).read()
    props = zipfile.ZipFile(io.BytesIO(data)).read("shaders/shaders.properties").decode("utf-8", "replace")
    presets = {}
    for line in props.splitlines():
        m = re.match(r"\s*profile\.([A-Z]+)\s*=\s*(.*)", line.strip("\r"))
        if m:
            presets[m.group(1)] = [tok for tok in m.group(2).split() if tok]
    return presets

def preset_to_iris_txt(tokens):
    """Complementary lists `KEY=value` tokens (booleans as `KEY=true/false` or `!KEY`)."""
    out = []
    for tok in tokens:
        if tok.startswith("profile."):
            continue  # Complementary's presets do not chain; guard anyway
        if "=" in tok:
            out.append(tok)
        elif tok.startswith("!"):
            out.append(f"{tok[1:]}=false")
        else:
            out.append(f"{tok}=true")
    return "\n".join(sorted(out)) + "\n"

def dh_keys(dh, transp, threads, quality, ssao):
    # chunkGeneratorMode must not be DISABLED on the client: in DH 3.x it also governs whether the client
    # requests LODs from a DH server. In singleplayer it is the local generator; SURFACE is the light one.
    gen = "SURFACE" if threads <= 1 else "FEATURES"
    lines = [f"lodChunkRenderDistanceRadius = {dh}", f"numberOfThreads = {threads}",
             f'transparency = "{transp}"', f'verticalQuality = "{quality}"', f'horizontalQuality = "{quality}"',
             f"enableSsao = {'true' if ssao else 'false'}", f'chunkGeneratorMode = "{gen}"']
    return "\n".join(lines) + "\n"

def embeddium_keys(weather, leaves, vignette):
    # JSON-style lines: launch.jar matches "key": value and keeps quoting and trailing commas
    return f'"weather_quality": "{weather}"\n"leaves_quality": "{leaves}"\n"enable_vignette": {vignette}\n'


def main():
    presets = load_presets()
    for tier, c in TIERS.items():
        d = OUT / tier
        (d / "config").mkdir(parents=True, exist_ok=True)
        (d / "shaderpacks").mkdir(parents=True, exist_ok=True)
        (d / "config/DistantHorizons.toml.keys").write_text(dh_keys(c["dh"], c["transp"], c["threads"], c["quality"], c["ssao"]))
        (d / "config/embeddium-options.json.keys").write_text(embeddium_keys(*c["emb"]))
        (d / "config/oculus.properties.keys").write_text(
            f"shaderPack={c['pack']}\nenableShaders={'true' if c['shaders'] else 'false'}\n")
        txt = preset_to_iris_txt(presets[c["preset"]])
        # settings for the plain pack and for the Euphoria folder, so switching packs in-game keeps the tier's preset
        (d / f"shaderpacks/{CR_ZIP}.txt.keys").write_text(txt)
        (d / f"shaderpacks/{EUPHORIA}.txt.keys").write_text(txt)
        packs = RESOURCE_PACKS if c.get("fresh_animations", True) else RESOURCE_PACKS.replace(',"file/FreshAnimations_v1.10.4.zip"', "")
        opts = dict(c["options"], resourcePacks=packs, **COMMON_KEYS)
        (d / "options.txt.keys").write_text("".join(f"{k}:{v}\n" for k, v in opts.items()))
        print(f"{tier:12s} shaders={'on ' if c['shaders'] else 'off'} {c['pack'][:28]:28s} {c['preset']:7s} DH {c['dh']:>3} {c['transp']:8s} {c['threads']}t")
    for rel, lines in PREVIOUS_DEFAULTS.items():
        f = OUT / "_previous" / rel
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text("".join(l + "\n" for l in lines))
    (OUT / "README.txt").write_text(
        "Hardware-tier profiles, applied by peacock/Launch.java according to the PEACOCK_PROFILE\n"
        "environment variable (potato | low | medium | high | ultra; default medium).\n"
        "Generated by tools/gen-profiles.py - edit TIERS there, not these files.\n"
        "_previous/ is not a profile: it lists defaults older pack versions wrote, so the launcher\n"
        "can tell an untouched old default from a player's own change.\n")

if __name__ == "__main__":
    main()
