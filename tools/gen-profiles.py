#!/usr/bin/env python3
"""Generate pack/peacock/profiles/<tier>/ from the pack defaults.

Profiles are named by hardware tier, never by OS. Each folder holds only what differs:
  config/DistantHorizons.toml      full file, derived from pack/config (the `medium` values)
  config/oculus.properties         shader pack + on/off
  shaderpacks/<pack>.txt           Iris per-pack option file = one of Complementary's own presets
  options.properties               keys merged into options.txt by peacock/Launch.java

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

#          tier          shaders  pack        preset      DH radius  DH transp.  threads  DH quality  options.txt keys
TIERS = {
    "potato":      dict(shaders=False, pack=CR_ZIP,  preset="POTATO",  dh=96,  transp="DISABLED", threads=1, quality="LOW",
                        options={"renderDistance": "6", "simulationDistance": "6", "graphicsMode": "0", "particles": "2",
                                 "entityShadows": "false", "biomeBlendRadius": "1", "mipmapLevels": "2", "entityDistanceScaling": "0.75"}),
    "low":         dict(shaders=True,  pack=CR_ZIP,  preset="POTATO",  dh=128, transp="FAKE",     threads=1, quality="LOW",
                        options={"renderDistance": "6", "simulationDistance": "6", "graphicsMode": "1", "particles": "1",
                                 "entityShadows": "false", "biomeBlendRadius": "2"}),
    "medium":      dict(shaders=True,  pack=CR_ZIP,  preset="MEDIUM",  dh=192, transp="FAKE",     threads=2, quality="MEDIUM",
                        options={"renderDistance": "8", "simulationDistance": "8", "graphicsMode": "1", "particles": "0",
                                 "entityShadows": "true", "biomeBlendRadius": "3"}),
    "high":        dict(shaders=True,  pack=EUPHORIA, preset="HIGH",   dh=256, transp="COMPLETE", threads=4, quality="MEDIUM",
                        options={"renderDistance": "10", "simulationDistance": "8", "graphicsMode": "2", "particles": "0",
                                 "entityShadows": "true", "biomeBlendRadius": "5"}),
    "ultra":       dict(shaders=True,  pack=EUPHORIA, preset="ULTRA",  dh=384, transp="COMPLETE", threads=6, quality="HIGH",
                        options={"renderDistance": "12", "simulationDistance": "10", "graphicsMode": "2", "particles": "0",
                                 "entityShadows": "true", "biomeBlendRadius": "7"}),
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

def dh_toml(base, dh, transp, threads, quality):
    t = base
    t = re.sub(r"(lodChunkRenderDistanceRadius = )\d+", rf"\g<1>{dh}", t)
    t = re.sub(r"(\n\t\tnumberOfThreads = )\d+", rf"\g<1>{threads}", t, count=1)
    t = re.sub(r'(transparency = ")[A-Z]+(")', rf"\g<1>{transp}\g<2>", t)
    t = re.sub(r'(verticalQuality = ")[A-Z]+(")', rf"\g<1>{quality}\g<2>", t)
    t = re.sub(r'(horizontalQuality = ")[A-Z]+(")', rf"\g<1>{quality}\g<2>", t)
    return t

def main():
    presets = load_presets()
    base_dh = (PACK / "config/DistantHorizons.toml").read_text()
    base_oculus = (PACK / "config/oculus.properties").read_text()
    for tier, c in TIERS.items():
        d = OUT / tier
        (d / "config").mkdir(parents=True, exist_ok=True)
        (d / "shaderpacks").mkdir(parents=True, exist_ok=True)
        (d / "config/DistantHorizons.toml").write_text(dh_toml(base_dh, c["dh"], c["transp"], c["threads"], c["quality"]))
        oc = re.sub(r"^shaderPack=.*$", f"shaderPack={c['pack']}", base_oculus, flags=re.M)
        oc = re.sub(r"^enableShaders=.*$", f"enableShaders={'true' if c['shaders'] else 'false'}", oc, flags=re.M)
        (d / "config/oculus.properties").write_text(oc)
        txt = preset_to_iris_txt(presets[c["preset"]])
        # settings for the plain pack and for the Euphoria folder, so switching packs in-game keeps the tier's preset
        (d / f"shaderpacks/{CR_ZIP}.txt").write_text(txt)
        (d / f"shaderpacks/{EUPHORIA}.txt").write_text(txt)
        (d / "options.properties").write_text(
            "# merged into options.txt by peacock/Launch.java (key=value, options.txt syntax is key:value)\n"
            + "".join(f"{k}={v}\n" for k, v in c["options"].items()))
        print(f"{tier:12s} shaders={'on ' if c['shaders'] else 'off'} {c['pack'][:28]:28s} {c['preset']:7s} DH {c['dh']:>3} {c['transp']:8s} {c['threads']}t")
    (OUT / "README.txt").write_text(
        "Hardware-tier profiles, applied by peacock/Launch.java according to the PEACOCK_PROFILE\n"
        "environment variable (potato | low | medium | high | ultra; default medium).\n"
        "Generated by tools/gen-profiles.py - edit TIERS there, not these files.\n")

if __name__ == "__main__":
    main()
