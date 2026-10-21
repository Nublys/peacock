// Peacock — the player list (Tab) opens below the compass bar (client only).
//
// 2026-10-20, Aaron: "Tab gets in the way over compass, makes it difficult to read." Reworked Locator Bar draws its
// compass at the top centre (y = 5 plus its own Y offset, ReworkedLocatorBarHudRenderer), and the player list draws
// from the top too, so holding Tab covered the directions and coordinates. Better Tab has no position setting and the
// compass can only be offset from the top, so this moves the list: Forge draws it inside one HUD layer,
// `minecraft:player_list`; Pre pushes the pose and shifts it down, Post pops it (same pattern as bossbar_scale.js).
//
// `tabListOffset` in kubejs/config/peacock.json: "auto" (default) lines the list's top up with Jade's overlay, which
// sits 10% of the screen height down (Jade overlayPosY 0.9) and already clears the compass by a good gap (Aaron,
// 2026-10-21: "reduce the gap ... you have Jade a good size gap"; the first fixed 30 px left too much); a number is
// a fixed shift in GUI pixels, 0 = vanilla position. If something cancels the layer after we pushed (so no Post
// comes), the next layer's Pre pops it first.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no Math constants.
;(() => {
if (!Platform.isClientEnvironment()) return
const CFG = (() => { try { return JsonIO.read('kubejs/config/peacock.json') || {} } catch (e) { return {} } })()
const FIXED = (typeof CFG.tabListOffset === 'number' && CFG.tabListOffset >= 0) ? CFG.tabListOffset : null
if (FIXED === 0) return
const LIST_TOP = 10        // vanilla draws the list (or its header) from y = 10
const JADE_FROM_TOP = 0.1  // Jade's overlayPosY 0.9: its box starts a tenth of the screen down

function offsetFor(event) {
  if (FIXED !== null) return FIXED
  var h = event.getWindow().getGuiScaledHeight()
  return Math.max(0, Math.round(h * JADE_FROM_TOP) - LIST_TOP)
}
const LAYER = 'minecraft:player_list'
let pushed = null

function isTabLayer(event) {
  try { return String(event.getOverlay().id()) === LAYER } catch (e) { return false }
}

ForgeEvents.onEvent('net.minecraftforge.client.event.RenderGuiOverlayEvent$Pre', event => {
  try {
    if (pushed) { pushed.popPose(); pushed = null }
    if (!isTabLayer(event)) return
    var pose = event.getGuiGraphics().pose()
    pose.pushPose()
    pose.translate(0, offsetFor(event), 0)
    pushed = pose
  } catch (e) { pushed = null }
})

ForgeEvents.onEvent('net.minecraftforge.client.event.RenderGuiOverlayEvent$Post', event => {
  try {
    if (pushed && isTabLayer(event)) { pushed.popPose(); pushed = null }
  } catch (e) { pushed = null }
})
})()
