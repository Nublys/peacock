// Peacock — no Village Recruits Manual.
//
// Village Recruits hands every new player a written book, "Village Recruits Manual" by "Village Council", on first
// login (VillageJoinGuide; no config switch exists). The Settler's Almanac explains Village Recruits instead
// (Aaron, 2026-10-18: "remove the Villager Recruits book and just explain all of that in yours").
//
// On login this marks the player as already having received it (the addon checks
// PlayerPersisted.village_recruits_received_book), and two seconds later removes any copy from the inventory — for
// players who got one before, and in case the addon's login handler ran before ours.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks.
;(() => {
const TITLE = 'Village Recruits Manual'
const AUTHOR = 'Village Council'

function isManual(stack) {
  if (!stack || stack.isEmpty() || String(stack.id) !== 'minecraft:written_book') return false
  var tag = stack.nbt
  return !!tag && String(tag.getString('title')) === TITLE && String(tag.getString('author')) === AUTHOR
}

PlayerEvents.loggedIn(event => {
  var p = event.player
  try {
    var data = p.getPersistentData()
    var kept = data.getCompound('PlayerPersisted')
    kept.putBoolean('village_recruits_received_book', true)
    data.put('PlayerPersisted', kept)
  } catch (e) { console.warn('[peacock] vr manual: could not mark ' + p.username + ' — ' + e) }
  // the addon hands the book over some time after login on a fresh world (2026-10-22: "You received the Village
  // Enlistment Manual" and no removal at 2 s), so look again at 10 s and 30 s
  ;[40, 200, 600].forEach(t => event.server.scheduleInTicks(t, () => {
    try {
      var inv = p.inventory
      var removed = 0
      for (var i = 0; i < inv.getContainerSize(); i++) {
        var stack = inv.getItem(i)
        if (isManual(stack)) { stack.setCount(0); removed++ }
      }
      if (removed > 0) console.info('[peacock] vr manual: removed ' + removed + ' from ' + p.username)
    } catch (e) { console.warn('[peacock] vr manual: ' + e) }
  }))
})
})()
