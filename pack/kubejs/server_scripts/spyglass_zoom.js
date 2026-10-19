// Peacock — Just Zoom only while you carry a spyglass (server half).
//
// Aaron, 2026-10-18: Just Zoom "should only work with a spyglass, and should work if the spyglass is in a
// backpack". Just Zoom has no such option (its zoom key always works), so the pack gates the key: once a second
// this checks each player's inventory (hotbar, main, off-hand, armour) and every equipped Backpacked backpack for a
// spyglass, and tells that player's client when the answer changes (client_scripts/spyglass_zoom_client.js binds
// or unbinds the zoom key). Backpack contents only exist on the server, which is why the check lives here.
// Holding a spyglass and using it also zooms through Just Zoom ("spyglass integration", on by default).
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks.
;(() => {
const EVERY = 20
const SPYGLASS = 'minecraft:spyglass'
const last = {}   // uuid -> boolean last sent

function stackListHas(list) {
  // a ListTag of item compounds ({id, Count, Slot...}), as backpacks store their contents
  if (!list) return false
  for (var i = 0; i < list.size(); i++) {
    if (String(list.getCompound(i).getString('id')) === SPYGLASS) return true
  }
  return false
}

function backpackHas(p) {
  try {
    var BH = Java.loadClass('com.mrcrayfish.backpacked.BackpackHelper')
    var packs = BH.getBackpacks(p)
    for (var i = 0; i < packs.size(); i++) {
      var stack = packs.get(i)
      if (!stack || stack.isEmpty()) continue
      var tag = stack.getTag()
      if (tag && stackListHas(tag.getList('Items', 10))) return true
    }
  } catch (e) { /* Backpacked missing or changed: inventory check still works */ }
  try {
    // the live inventories of open/equipped backpacks, in case a change has not been written to the stack yet
    var it = p.backpacked$streamNonNullBackpackInventories().iterator()
    while (it.hasNext()) {
      var inv = it.next()
      for (var j = 0; j < inv.getContainerSize(); j++) {
        if (String(inv.getItem(j).id) === SPYGLASS) return true
      }
    }
  } catch (e) { }
  return false
}

function carries(p) {
  var inv = p.inventory
  for (var i = 0; i < inv.getContainerSize(); i++) {
    if (String(inv.getItem(i).id) === SPYGLASS) return true
  }
  return backpackHas(p)
}

ServerEvents.tick(event => {
  var s = event.server
  if (s.tickCount % EVERY !== 0) return
  s.players.forEach(p => {
    try {
      var has = carries(p)
      var id = p.stringUuid
      if (last[id] === has) return
      last[id] = has
      p.sendData('peacock:zoom', { spyglass: has })
    } catch (e) { console.warn('[peacock] spyglass zoom: ' + e) }
  })
})

PlayerEvents.loggedIn(event => { delete last[event.player.stringUuid] })
PlayerEvents.loggedOut(event => { delete last[event.player.stringUuid] })
})()
