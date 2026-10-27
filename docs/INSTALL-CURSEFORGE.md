# Installing Peacock with the CurseForge App

The CurseForge app cannot run the pack's pre-launch step, so it gets a fixed version with your graphics
tier already baked in. It works fine; the two differences from Prism are that **updates mean importing the
next release's zip**, and the tier is chosen by which zip you download rather than in-game.
If you can use Prism, [that guide](INSTALL-PRISM.md) is the better path.

## 1. Pick your zip

From the [latest release](https://github.com/Nublys/peacock/releases/latest), download the one for your machine:

| file | for |
|---|---|
| `Peacock-X.Y.Z-curseforge-potato.zip` | integrated graphics, old or hot laptop, under 16 GB — shaders off |
| `Peacock-X.Y.Z-curseforge-low.zip` | integrated graphics with headroom; a fanless MacBook Air — **pick this if unsure** |
| `Peacock-X.Y.Z-curseforge-medium.zip` | thin laptop with a fan, 16 GB |
| `Peacock-X.Y.Z-curseforge-high.zip` | laptop with a real GPU |
| `Peacock-X.Y.Z-curseforge-ultra.zip` | desktop with a dedicated GPU |

Macs: `low` or `medium` only — the shader variant in `high` and `ultra` needs more than macOS OpenGL offers.

## 2. Import

CurseForge app → Minecraft → **Create Custom Profile** → **Import** → choose the zip. The app installs
Forge 47.4.16 and downloads the mods (a few minutes). Mods that CurseForge does not host are included in the
zip itself, so nothing is missing afterwards.

## 3. Memory and Java

Profile → ⋯ → **Profile Options** → untick *Use system memory settings* and set **6144 MB** (8192 on a 32 GB
machine; more is not faster). The app supplies Java 17 on its own. On a Mac, make sure the app itself is the
Apple Silicon build.

## 4. Join

Play → Multiplayer → Add Server → the address from the group chat. Voice chat is built in (`,` for its
menu, voice-activated by default). You are handed **The Settler's Almanac** on first join.

## Updating

When a new version is released, the server moves to it and older clients can no longer connect. Download the
new zip for your tier and import it as a new profile; the old profile can be deleted once the new one works.
Your worlds and screenshots are not involved — this is a server pack.

## Changing tier later

Import the zip for the other tier as a new profile. The in-game `/peacock profile` command only works where
the pre-launch step runs (Prism, or the Modrinth App with its launch hook); here it will tell you the tier was set, but nothing applies it.
Your own video and shader settings still work normally: `K` toggles shaders, `O` opens the shader menu, and
Distant Horizons' radius is the first thing to lower if frames drop.
