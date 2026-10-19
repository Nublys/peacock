// Peacock — reroll a brand-new world that has no capital (Aaron approved, 2026-10-18).
//
// The capital only generates on temperate, low, dry land, and vanilla gives it one candidate position per seed; on
// many seeds there is simply no capital. Rather than build one by script (far too slow on this host), the server
// tries another seed: 15 seconds after load, if there is no capital at spawn AND the world is brand new, this writes
// kubejs/config/peacock-reroll.json and stops the server. peacock-start.sh sees the file, deletes that world folder
// (only if it holds no player data at all), clears level-seed, and starts again on a fresh random seed.
//
// "Brand new" is checked three ways: the world's own clock is under two minutes (an old world has hours), nobody
// has ever logged in to it (a flag set on first login), and nobody is online. The start script adds a fourth: the
// world folder's playerdata/ is empty. After 15 tries in a row it stops rerolling and keeps the world.
// Switch: capitalReroll in kubejs/config/peacock.json (true by default).
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks.
;(() => {
const SWITCHES = (() => { try { return JsonIO.read('kubejs/config/peacock.json') || {} } catch (e) { return {} } })()
const ON = SWITCHES.capitalReroll !== false
const MARKER = 'kubejs/config/peacock-reroll.json'
const COUNT = 'kubejs/config/peacock-reroll-count.json'
const MAX_TRIES = 15
const NEW_WORLD_TICKS = 2400
const CAPITALS = [['terralith', 'fortified_village'], ['peacock', 'capital/plains'], ['peacock', 'capital/taiga']]

function hasCapital(server) {
  var level = server.overworld()
  var Registries = Java.loadClass('net.minecraft.core.registries.Registries')
  var ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
  var reg = level.registryAccess().registryOrThrow(Registries.STRUCTURE)
  var spawn = level.getSharedSpawnPos()
  for (var i = 0; i < CAPITALS.length; i++) {
    var s = reg.get(new ResourceLocation(CAPITALS[i][0], CAPITALS[i][1]))
    if (!s) continue
    var start = level.structureManager().getStructureAt(spawn, s)
    if (start && start.isValid()) return true
  }
  // a capital founded by hand (/peacock found) is recorded here
  return !!server.persistentData.getString('peacock_capital_bb')
}

function tries() {
  try { var d = JsonIO.read(COUNT); return d && d.tries ? Number(d.tries) : 0 } catch (e) { return 0 }
}

PlayerEvents.loggedIn(event => { event.server.persistentData.putBoolean('peacock_had_players', true) })

ServerEvents.loaded(event => {
  if (!ON) return
  var server = event.server
  server.scheduleInTicks(300, () => {
    try {
      var log = m => console.info('[peacock] reroll: ' + m)
      var age = server.overworld().getGameTime()
      if (hasCapital(server)) {
        if (tries() > 0) { log('capital found after ' + tries() + ' reroll(s)'); JsonIO.write(COUNT, { tries: 0 }) }
        return
      }
      if (age > NEW_WORLD_TICKS) return                                   // an old world: never touched
      if (server.persistentData.getBoolean('peacock_had_players')) return
      if (server.players.size() > 0) return
      var n = tries()
      if (n >= MAX_TRIES) { log('no capital, but ' + n + ' rerolls in a row; keeping this world'); JsonIO.write(COUNT, { tries: 0 }); return }
      JsonIO.write(MARKER, { reroll: true, attempt: n + 1, worldTicks: Number(age) })
      log('no capital on this seed (world ' + age + ' ticks old, never joined) — attempt ' + (n + 1) + ' of ' + MAX_TRIES + ', stopping for a new seed')
      server.runCommandSilent('stop')
    } catch (e) { console.error('[peacock] reroll: failed — ' + e) }
  })
})
})()
