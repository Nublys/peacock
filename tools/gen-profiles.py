#!/usr/bin/env python3
"""Generate pack/peacock/profiles/<tier>/ from the pack defaults.

Profiles are named by hardware tier, never by OS. Each folder holds *.keys files -- one setting per
line in the target file's own syntax -- applied per setting by peacock/launch.jar:
  config/DistantHorizons.toml.keys     radius, threads, transparency, quality (TOML `key = value`)
  config/oculus.properties.keys        shader pack + on/off
  config/embeddium-options.json.keys   weather/leaves quality, vignette ("key": value lines)
  shaderpacks/<pack>.txt.keys          Iris per-pack options = one of Complementary's own presets
  options.txt.keys                     render distance etc. (`key:value`)
  config/soundphysics/soundphysics.properties.keys   Sound Physics on/off (off on potato)
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
# Appalachia-style look (2026-10-20): grass, foliage, 3D models, sun & moon, Fresh Animations' add-ons. Later = on top.
RESOURCE_PACKS = '["vanilla","mod_resources","file/Fast-Better-Grass.zip","file/rainbows-foliage-vanilla-edition-v2.1.zip","file/3D-Default-1.20-v1.16.0.zip","file/Better-Leaves-9.6.zip","file/EnhancedBossBars-1.6.zip","file/xalis-enchanted-books-1.0.0-beta.2.zip","file/xalis-potions-1.2.0.zip","file/LowOnFire-26.3.zip","file/cubic-sun-moon-v1.8.5.zip","file/FreshAnimations_v1.10.4.zip","file/FA+Details-v2.2.1.zip","file/FA+Objects-v2.1.2.zip"]'
# potato: no 3D models, no Fresh Animations (or its add-ons) — extra geometry per block/entity
POTATO_DROP = ['"file/3D-Default-1.20-v1.16.0.zip"', '"file/FreshAnimations_v1.10.4.zip"', '"file/FA+Details-v2.2.1.zip"', '"file/FA+Objects-v2.1.2.zip"']

#          tier          shaders  pack        preset      DH radius  DH transp.  threads  DH quality  options.txt keys
TIERS = {
    "potato":      dict(shaders=False, pack=CR_ZIP,  preset="POTATO",  dh=64,  transp="DISABLED", threads=1, quality="LOW", ssao=False, emb=("FAST","FAST","false"),
                        fresh_animations=False,
                        options={"renderDistance": "6", "simulationDistance": "6", "graphicsMode": "0", "particles": "2",
                                 "entityShadows": "false", "biomeBlendRadius": "1", "mipmapLevels": "2", "entityDistanceScaling": "0.5",
                                 "renderClouds": '"false"'}),
    "low":         dict(shaders=True,  pack=CR_ZIP,  preset="POTATO",  dh=128, transp="FAKE",     threads=1, quality="LOW", ssao=False, emb=("FAST","FAST","false"),
                        options={"renderDistance": "6", "simulationDistance": "6", "graphicsMode": "1", "particles": "1",
                                 "entityShadows": "false", "biomeBlendRadius": "2", "entityDistanceScaling": "0.75",
                                 "renderClouds": '"fast"'}),
    "medium":      dict(shaders=True,  pack=CR_ZIP,  preset="MEDIUM",  dh=192, transp="FAKE",     threads=2, quality="MEDIUM", ssao=True, emb=("DEFAULT","DEFAULT","true"),
                        options={"renderDistance": "8", "simulationDistance": "8", "graphicsMode": "1", "particles": "0",
                                 "entityShadows": "true", "biomeBlendRadius": "3", "entityDistanceScaling": "1.0",
                                 "renderClouds": '"true"'}),
    "high":        dict(shaders=True,  pack=EUPHORIA, preset="HIGH",   dh=256, transp="COMPLETE", threads=4, quality="MEDIUM", ssao=True, emb=("FANCY","FANCY","true"),
                        options={"renderDistance": "10", "simulationDistance": "8", "graphicsMode": "2", "particles": "0",
                                 "entityShadows": "true", "biomeBlendRadius": "5", "entityDistanceScaling": "1.0",
                                 "renderClouds": '"true"'}),
    "ultra":       dict(shaders=True,  pack=EUPHORIA, preset="ULTRA",  dh=384, transp="COMPLETE", threads=6, quality="HIGH", ssao=True, emb=("FANCY","FANCY","true"),
                        options={"renderDistance": "12", "simulationDistance": "10", "graphicsMode": "2", "particles": "0",
                                 "entityShadows": "true", "biomeBlendRadius": "7", "entityDistanceScaling": "1.0",
                                 "renderClouds": '"true"'}),
}

# Values earlier pack versions wrote as defaults. launch.jar treats a setting that still equals one of these as
# "not the player's own" and updates it, so a changed default reaches existing installs. Append, never remove.
PREVIOUS_DEFAULTS = {
    "options.txt.keys": [
        'resourcePacks:["vanilla","mod_resources","file/FreshAnimations_v1.10.4.zip"]',
        'resourcePacks:' + '["vanilla","mod_resources","file/Better-Leaves-9.6.zip","file/EnhancedBossBars-1.6.zip","file/xalis-enchanted-books-1.0.0-beta.2.zip","file/xalis-potions-1.2.0.zip","file/LowOnFire-26.3.zip","file/FreshAnimations_v1.10.4.zip"]',
        'resourcePacks:' + '["vanilla","mod_resources","file/Better-Leaves-9.6.zip","file/EnhancedBossBars-1.6.zip","file/xalis-enchanted-books-1.0.0-beta.2.zip","file/xalis-potions-1.2.0.zip","file/LowOnFire-26.3.zip"]',
        # vanilla's own first-launch values (2026-10-18: the launcher kept these as "yours", so screens stayed on)
        "realmsNotifications:true", "onboardAccessibility:true", "skipMultiplayerWarning:false",
        "joinedFirstServer:false", "tutorialStep:movement",
        # potato wrote clouds unquoted until 2026-10-20 (vanilla writes "false"); the shipped first-launch options.txt
        # had clouds off for everyone, so a still-off value counts as untouched and the tier's choice applies
        'renderClouds:false', 'renderClouds:"false"',
    ],
    # Camera Overhaul's own defaults (general, then the walking section's tilts): replaced by the gentler values above
    "config/cameraoverhaul.toml.keys": [
        "cameraSwayIntensity = 0.6", "turningRollIntensity = 1.25",
        "strafingRollFactor = 10.0", "forwardVelocityPitchFactor = 7.0", "verticalVelocityPitchFactor = 2.5",
        # per section (2026-10-20, once the launcher could scope keys to a [table]): the mod's stock values for each
        # movement, and for [walking] also the first pack values (5.0 / 3.5 / 1.5), which were written without a section
        "[general]", "cameraSwayIntensity = 0.6", "turningRollIntensity = 1.25", "cameraSwayIntensity = 0.2", "turningRollIntensity = 0.5",
        "[walking]", "strafingRollFactor = 10.0", "forwardVelocityPitchFactor = 7.0", "verticalVelocityPitchFactor = 2.5",
        "strafingRollFactor = 5.0", "forwardVelocityPitchFactor = 3.5", "verticalVelocityPitchFactor = 1.5",
        "[sprinting]", "strafingRollFactor = 12.5", "forwardVelocityPitchFactor = 9.5", "verticalVelocityPitchFactor = 2.5",
        "[swimming]", "strafingRollFactor = -3.0", "forwardVelocityPitchFactor = 3.0", "verticalVelocityPitchFactor = 3.0",
        "[flying]", "strafingRollFactor = -1.0", "forwardVelocityPitchFactor = 7.0", "verticalVelocityPitchFactor = 2.5",
        "cameraSmoothing = 1.0",
        "[mounts]", "strafingRollFactor = 2.0", "verticalVelocityPitchFactor = 2.5",
        "[vehicles]", "verticalVelocityPitchFactor = 2.0",
    ],
    # the mods' shipped values before the quieter-boot change; without these the launcher took the old `true`s for
    # the player's own choice and kept the update popup and join warnings ("keep … 8 setting(s) you changed")
    "config/DistantHorizons.toml.keys": [
        "enableAutoUpdater = true", "showLowMemoryWarningOnStartup = true", "showReplayWarningOnStartup = true",
        "showModCompatibilityWarningsOnStartup = true", "showHighVanillaRenderDistanceWarning = true",
        "showPoolInsufficientMemoryWarning = true", "showGarbageCollectorWarning = true",
        "showSlowWorldGenSettingWarnings = true",
    ],
    "config/embeddium-options.json.keys": ['"force_disable_donation_prompts": false'],
    "config/coldsweat/client.toml.keys": ["[Preferences]", '"Show Water Effect" = 3'],
    "config/subtle_effects/entities.toml.keys": ["[dustClouds]", "playerRunning = true"],
    "config/subtle_effects/blocks.toml.keys": ["rainWaterRipples = true"],
    "config/colorwheel-client.toml.keys": ["alertIncompatiblePack = true", "alertBrokenPack = true"],
    "config/entity_model_features.json.keys": ['"showReloadErrorToast": true'],
    "config/locatorbar.json.keys": ['"unsupportedVersionWarningShown": false'],
}

# Settings every tier writes into options.txt (keys the launcher adds when missing): keybinds that
# would otherwise collide. FTB Chunks' large map defaults to M (Map Atlases); its claim manager goes on J.
COMMON_KEYS = {
    "key_key.ftbchunks.map": "key.keyboard.unknown",
    "key_key.ftbchunks.claim_manager": "key.keyboard.j",
    "key_key.ftbchunks.toggle_minimap": "key.keyboard.unknown",
    "key_key.ftbchunks.add_waypoint": "key.keyboard.unknown",
    "key_key.ftbchunks.waypoint_manager": "key.keyboard.unknown",
    # Just Zoom's options screen defaults to B, which is the backpack; its options stay reachable from the mod list
    "key_justzoom.keybinds.keybind.open_options": "key.keyboard.unknown",
    # first-launch screens and toasts (only added when missing: a player's own choice stands)
    "onboardAccessibility": "false", "skipMultiplayerWarning": "true", "joinedFirstServer": "true",
    "tutorialStep": "none", "realmsNotifications": "false",
}

# Extra *.keys files written into every tier (same content). Jade: a smaller, quieter block/entity overlay
# and no mod-name line on item tooltips (Aaron, 2026-10-17: tooltips get in the way; the hotbar stays).
COMMON_FILES = {
    # overlayPosY 0.9 (1.0 is the top edge) keeps the overlay clear of the locator bar; pack/config/jade/jade.json
    # ships the same values in Jade's nested layout so a flat keys-only file never has to stand in for it
    "config/jade/jade.json.keys": '"overlayScale": 0.7\n"alpha": 0.6\n"overlayPosY": 0.9\n"itemModNameTooltip": false\n',
    # the locator bar at half size (Aaron, 2026-10-18); the shipped config/locatorbar.json carries the same
    "config/locatorbar.json.keys": '"scale": 0.5\n"unsupportedVersionWarningShown": true\n',
    # boot/join noise, in files that are `preserve = true` (so the shipped copy never reaches an existing install):
    # Colorwheel's "incompatible shaderpack" chat line, EMF's reload-error toast
    "config/colorwheel-client.toml.keys": "alertIncompatiblePack = false\nalertBrokenPack = false\n",
    "config/entity_model_features.json.keys": '"showReloadErrorToast": false\n',
    # Cold Sweat's wet effect: blocky water drops running down the screen after leaving water (Aaron, 2026-10-20:
    # "blocky blue drops work their way down the screen"). 0 off, 1 drip particles, 2 on-screen, 3 both (the default)
    "config/coldsweat/client.toml.keys": '[Preferences]\n"Show Water Effect" = 0\n',
    # Subtle Effects' dust cloud trailing a running player (Aaron, 2026-10-20: "not a whole trail, just a little dust
    # below the feet") is off; vanilla's own sprint particles under the feet stay. Mobs' running dust stays.
    "config/subtle_effects/entities.toml.keys": "[dustClouds]\nplayerRunning = false\n",
    # rain ripples on water: Particle Rain draws them too (and its density follows the tier), so Subtle Effects' set
    # is off rather than doubling every pond in the rain (Aaron, 2026-10-20)
    "config/subtle_effects/blocks.toml.keys": "rainWaterRipples = false\n",
    # Camera Overhaul, gentler again (Aaron, 2026-10-20: "lower the camera sway", then "reduce the walking, jumping,
    # looking around, and flying sway further"). [general]: idle sway and the roll when turning.
    # The tilts repeat under each movement's table, so they are scoped with [table] lines (launch.jar matches a key
    # inside that table only). strafing = sideways roll, forward = pitch when moving, vertical = pitch when jumping or
    # falling; flying's cameraSmoothing is the floaty lag on the view. The mod's stock values are in _previous.
    "config/cameraoverhaul.toml.keys": (
        "[general]\ncameraSwayIntensity = 0.1\nturningRollIntensity = 0.2\n"
        "[walking]\nstrafingRollFactor = 2.0\nforwardVelocityPitchFactor = 1.5\nverticalVelocityPitchFactor = 0.5\n"
        "[sprinting]\nstrafingRollFactor = 3.0\nforwardVelocityPitchFactor = 2.0\nverticalVelocityPitchFactor = 0.5\n"
        "[swimming]\nstrafingRollFactor = -1.0\nforwardVelocityPitchFactor = 1.0\nverticalVelocityPitchFactor = 1.0\n"
        "[flying]\nstrafingRollFactor = -0.5\nforwardVelocityPitchFactor = 1.5\nverticalVelocityPitchFactor = 0.5\ncameraSmoothing = 0.25\n"
        "[mounts]\nstrafingRollFactor = 1.0\nverticalVelocityPitchFactor = 1.0\n"
        "[vehicles]\nverticalVelocityPitchFactor = 1.0\n"),
}

# Particle mods per tier (Aaron, 2026-10-20). Particle Rain (config/particlerain/config.json, its defaults are
# max 1500 / density 75 / storm 100 / 16 blocks), Falling Leaves (spawn rate 10, conifers 2) and Subtle Effects'
# particle culling distance (default 5, range 1-32). medium and up get the mods' own defaults.
PARTICLES = {
    "potato": dict(rain=(400, 20, 25, 10), leaves=(3, 1), se_dist=3),
    "low":    dict(rain=(750, 40, 50, 12), leaves=(6, 1), se_dist=4),
    "medium": dict(rain=(1500, 75, 100, 16), leaves=(10, 2), se_dist=5),
    "high":   dict(rain=(1500, 75, 100, 16), leaves=(10, 2), se_dist=5),
    "ultra":  dict(rain=(1500, 75, 100, 16), leaves=(10, 2), se_dist=5),
}

def particle_files(tier):
    p = PARTICLES[tier]
    mx, dens, storm, dist = p["rain"]
    return {
        "config/particlerain/config.json.keys": (f'"maxParticleAmount": {mx}\n"particleDensity": {dens}\n'
                                                 f'"particleStormDensity": {storm}\n"particleDistance": {dist}\n'),
        "config/fallingleaves-client.toml.keys": f"leafSpawnRate = {p['leaves'][0]}\nconiferLeafSpawnRate = {p['leaves'][1]}\n",
        "config/subtle_effects/general.toml.keys": f"enableParticleCulling = true\nparticleRenderDistance = {p['se_dist']}\n",
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
             f"enableSsao = {'true' if ssao else 'false'}", f'chunkGeneratorMode = "{gen}"',
             # no update popup at boot and no chat warnings on join (2026-10-18: "lots of pop ups to click through");
             # players get DH updates through the pack, and the warnings are about settings the profile already chose
             "enableAutoUpdater = false", "showLowMemoryWarningOnStartup = false", "showReplayWarningOnStartup = false",
             "showModCompatibilityWarningsOnStartup = false", "showHighVanillaRenderDistanceWarning = false",
             "showPoolInsufficientMemoryWarning = false", "showGarbageCollectorWarning = false",
             "showSlowWorldGenSettingWarnings = false"]
    return "\n".join(lines) + "\n"

def embeddium_keys(weather, leaves, vignette):
    # JSON-style lines: launch.jar matches "key": value and keeps quoting and trailing commas
    return (f'"weather_quality": "{weather}"\n"leaves_quality": "{leaves}"\n"enable_vignette": {vignette}\n'
            '"force_disable_donation_prompts": true\n')


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
        packs = RESOURCE_PACKS
        if not c.get("fresh_animations", True):
            for p in POTATO_DROP:
                packs = packs.replace("," + p, "")
        opts = dict(c["options"], resourcePacks=packs, **COMMON_KEYS)
        (d / "options.txt.keys").write_text("".join(f"{k}:{v}\n" for k, v in opts.items()))
        # Sound Physics Remastered (cave echo, muffling through walls) costs CPU per sound; off on potato only
        (d / "config/soundphysics").mkdir(parents=True, exist_ok=True)
        (d / "config/soundphysics/soundphysics.properties.keys").write_text(
            f"enabled={'false' if tier == 'potato' else 'true'}\n")
        for rel, content in {**COMMON_FILES, **particle_files(tier)}.items():
            (d / rel).parent.mkdir(parents=True, exist_ok=True)
            (d / rel).write_text(content)
        print(f"{tier:12s} shaders={'on ' if c['shaders'] else 'off'} {c['pack'][:28]:28s} {c['preset']:7s} DH {c['dh']:>3} {c['transp']:8s} {c['threads']}t")
    for rel, lines in PREVIOUS_DEFAULTS.items():
        f = OUT / "_previous" / rel
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text("".join(l + "\n" for l in lines))
    (OUT / "README.txt").write_text(
        "Hardware-tier profiles, applied by peacock/launch.jar: the tier picked in game (/peacock profile, saved in\n"
        "kubejs/config/peacock-profile.json), else PEACOCK_PROFILE, else low (potato | low | medium | high | ultra).\n"
        "Generated by tools/gen-profiles.py - edit TIERS there, not these files.\n"
        "_previous/ is not a profile: it lists defaults older pack versions wrote, so the launcher\n"
        "can tell an untouched old default from a player's own change.\n")

if __name__ == "__main__":
    main()
