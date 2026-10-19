// Peacock — smaller boss bars (client only).
//
// 2026-10-18: "a boss bar pop up covered a quarter of the screen". Modded bosses (Cataclysm, Mowzie's, the
// Illager mods) draw large custom bars, and the Enhanced Boss Bars resource pack frames them further. No boss-bar
// scaling mod exists for Forge 1.20.1, but Forge draws every boss bar — vanilla and modded, which hook in through
// CustomizeGuiOverlayEvent.BossEventProgress — inside one HUD layer, `minecraft:boss_event_progress`. This scales
// that layer about the top centre of the screen: Pre pushes the pose and scales, Post pops it.
//
// `bossBarScale` in kubejs/config/peacock.json (default 0.5, 1 = vanilla size). If something cancels the layer
// after we pushed (so no Post comes), the next layer's Pre pops it first, so the rest of the HUD is never scaled.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no Math constants.
;(() => {
if (!Platform.isClientEnvironment()) return
const CFG = (() => { try { return JsonIO.read('kubejs/config/peacock.json') || {} } catch (e) { return {} } })()
const SCALE = (typeof CFG.bossBarScale === 'number' && CFG.bossBarScale > 0) ? CFG.bossBarScale : 0.5
if (SCALE === 1) return
const LAYER = 'minecraft:boss_event_progress'
let pushed = null

function isBossLayer(event) {
  try { return String(event.getOverlay().id()) === LAYER } catch (e) { return false }
}

ForgeEvents.onEvent('net.minecraftforge.client.event.RenderGuiOverlayEvent$Pre', event => {
  try {
    if (pushed) { pushed.popPose(); pushed = null }
    if (!isBossLayer(event)) return
    var pose = event.getGuiGraphics().pose()
    var w = event.getWindow().getGuiScaledWidth()
    pose.pushPose()
    pose.translate(w / 2 * (1 - SCALE), 0, 0)   // keep the bars centred
    pose.scale(SCALE, SCALE, 1)
    pushed = pose
  } catch (e) { pushed = null }
})

ForgeEvents.onEvent('net.minecraftforge.client.event.RenderGuiOverlayEvent$Post', event => {
  try {
    if (pushed && isBossLayer(event)) { pushed.popPose(); pushed = null }
  } catch (e) { pushed = null }
})
})()
