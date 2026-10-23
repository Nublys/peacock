// Peacock — villagers restock when they wake from a night in bed, and only then (2026-10-23).
//
// Aaron: "In my head they should restock on sleep." In vanilla a villager with a job refreshes all its trades at its
// workstation, up to twice a day, sleep or no sleep. Villager Restock Balance (removed the same day) tried to require a
// night in bed by writing "RestocksToday = 2" into every villager's saved data every tick, about 5% of the server tick
// (spark), yet vanilla resets that count itself on a villager's first restock of a new day, so only the second daily
// restock was ever blocked. This script replaces it:
//   • Once a second, every loaded villager's trades are read directly (no saved-data rewrite). If any trade's uses went
//     down since the last look, vanilla restocked it at the workstation: the old uses are put back.
//   • A villager seen asleep is marked; the first time it is seen awake again during the day it restocks all its trades
//     (Villager.restock), once per day. No bed, or kept awake all night: no restock.
//   • The capital's service people (tag peacock_npc) keep their own daily restock (capital_npcs.js) and are skipped.
// A vanilla restock can stand for up to a second before it is undone; a trade made in that second simply counts.
// Per villager, in its persistentData: peacock_uses ("3,0,12,…" one number per trade), peacock_slept, peacock_restock_day.
// Switch: "sleepRestock" in kubejs/config/peacock.json (false = vanilla restocking).
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants,
// loop variables declared before their loops.
;(() => {
const CFG = (() => { try { return JsonIO.read('kubejs/config/peacock.json') || {} } catch (e) { return {} } })()
const ON = CFG.sleepRestock !== false
const USES = 'peacock_uses', SLEPT = 'peacock_slept', DAY = 'peacock_restock_day'   // DAY holds day + 1 (0 = never)
const VILLAGER = Java.loadClass('net.minecraft.world.entity.EntityType').VILLAGER
var warned = {}                     // each distinct error logged once, not once a second per villager

function usesOf(offers) {
  var out = [], i
  for (i = 0; i < offers.size(); i++) out.push(offers.get(i).getUses())
  return out
}

function check(v, dayTime) {
  if (v.tags && v.tags.contains('peacock_npc')) return
  var offers = v.getOffers()
  if (!offers || offers.isEmpty()) return
  var data = v.persistentData, cur = usesOf(offers), i, k
  var day = Math.floor(dayTime / 24000), daytime = (dayTime % 24000) < 12000

  if (v.isSleeping()) { data.putBoolean(SLEPT, true); data.putString(USES, cur.join(',')); return }

  // awake after a night in bed: the one restock of the day
  if (daytime && data.getBoolean(SLEPT) && data.getInt(DAY) !== day + 1) {
    v.restock()
    data.putBoolean(SLEPT, false)
    data.putInt(DAY, day + 1)
    data.putString(USES, usesOf(offers).join(','))
    return
  }

  // anything that went back to fewer uses was a vanilla restock: undo it
  var prev = String(data.getString(USES) || '')
  if (prev) {
    var p = prev.split(',').map(Number)
    if (p.length === cur.length) {
      for (i = 0; i < cur.length; i++) {
        if (cur[i] >= p[i]) continue
        var o = offers.get(i)
        for (k = cur[i]; k < p[i]; k++) o.increaseUses()
        cur[i] = p[i]
      }
    }
  }
  data.putString(USES, cur.join(','))
}

ServerEvents.tick(event => {
  if (!ON) return
  var server = event.server
  if (server.tickCount % 20 !== 7) return
  try {
    server.getAllLevels().forEach(level => {
      var dayTime = Number(level.getDayTime())
      level.getEntities(VILLAGER, e => true).forEach(e => {              // vanilla's by-type lookup, villagers only
        try { check(e, dayTime) } catch (err) { if (!warned[String(err)]) { warned[String(err)] = true; console.warn('[peacock] restock: ' + err) } }
      })
    })
  } catch (e) { console.warn('[peacock] restock: ' + e) }
})
})()
