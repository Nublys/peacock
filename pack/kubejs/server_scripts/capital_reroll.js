// Peacock — reroll a brand-new world that has no capital (Aaron approved, 2026-10-18).
//
// The capital only generates on temperate, low, dry land, and vanilla gives it one candidate position per seed; on
// many seeds there is simply no capital. Rather than build one by script (far too slow on this host), the server
// tries another seed: 15 seconds after load, if there is no capital at spawn or anywhere in reach AND the world is
// brand new, this writes
// kubejs/config/peacock-reroll.json and stops the server. peacock-start.sh sees the file, deletes that world folder
// (only if it holds no player data at all), clears level-seed, and starts again on a fresh random seed.
//
// "Brand new" is checked several ways: this is the world's first boot with this script (a flag saved with the world),
// its clock is under two minutes when the clock can be read (an old world has hours), nobody has ever logged in to it
// (a flag set on first login), and nobody is online. The start script adds one more: the world folder's playerdata/
// is empty. After 15 tries in a row it stops rerolling and keeps the world.
//
// The clock: `level.getGameTime()` is not reachable from KubeJS on this server ("Cannot find function getGameTime in
// object ServerLevel", every boot through 2026-10-19 16:13 — so the reroll never once ran). worldAge() tries the
// other names for it and returns null when none work; the first-boot flag alone then decides.
//
// A capital with a Village Recruits tower beside it is rerolled too (village review, 2026-10-19). The tower set can
// keep clear of only one other set and that is the ruins, so on roughly one seed in ten a tower can generate within
// a few chunks of the capital's walls. The keep-out round spawn stops it founding a town there, but the tower itself
// would stand. The check asks the tower set's own placement maths whether any of its chunks lie within VR_CLEAR
// chunks of the capital's centre: arithmetic only, nothing is generated (it errs towards rerolling, since a tower
// position can still fail its biome check).
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
const VR_SET = ['minecraft', 'villages']   // Village Recruits' tower_spawner (paxi peacock/…/structure_set/villages.json)
const VR_CLEAR = 9                          // chunks: the capital reaches ~7 from its centre, plus the wall
const CAPITALS = [['terralith', 'fortified_village'], ['peacock', 'capital/plains'], ['peacock', 'capital/taiga']]

// The capital at spawn: {x, z} (its centre chunk), {} for one founded by hand (no chunk to check), or null.
function capitalAtSpawn(server) {
  var level = server.overworld()
  var Registries = Java.loadClass('net.minecraft.core.registries.Registries')
  var ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
  var reg = level.registryAccess().registryOrThrow(Registries.STRUCTURE)
  var spawn = level.getSharedSpawnPos()
  for (var i = 0; i < CAPITALS.length; i++) {
    var s = reg.get(new ResourceLocation(CAPITALS[i][0], CAPITALS[i][1]))
    if (!s) continue
    var start = level.structureManager().getStructureAt(spawn, s)
    if (start && start.isValid()) { var c = start.getChunkPos(); return { x: Number(c.x), z: Number(c.z) } }
  }
  // a capital founded by hand (/peacock found) is recorded here
  return server.persistentData.getString('peacock_capital_bb') ? {} : null
}

function towerNear(server, cx, cz) {
  var level = server.overworld()
  var Registries = Java.loadClass('net.minecraft.core.registries.Registries')
  var ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
  var ResourceKey = Java.loadClass('net.minecraft.resources.ResourceKey')
  var reg = level.registryAccess().registryOrThrow(Registries.STRUCTURE_SET)
  var holder = reg.getHolder(ResourceKey.create(Registries.STRUCTURE_SET, new ResourceLocation(VR_SET[0], VR_SET[1])))
  if (!holder.isPresent()) return false
  return level.getChunkSource().getGeneratorState().hasStructureChunkInRange(holder.get(), cx, cz, VR_CLEAR)
}

// The capital exists but spawn is not in it (Village Spawn Point found nothing once, 2026-10-18 21:37, though it
// generated). The capital is a one-position concentric-ring structure inside the spawn area, so this locate only
// checks that one already-generated chunk: cheap, unlike a random-spread search.
function locateCapital(server) {
  var level = server.overworld()
  var Registries = Java.loadClass('net.minecraft.core.registries.Registries')
  var ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
  var TagKey = Java.loadClass('net.minecraft.tags.TagKey')
  var BlockPos = Java.loadClass('net.minecraft.core.BlockPos')
  var tag = TagKey.create(Registries.STRUCTURE, new ResourceLocation('peacock', 'capital'))
  return level.findNearestMapStructure(tag, new BlockPos(0, 64, 0), 16, false)
}

function moveSpawnTo(server, pos, log) {
  var level = server.overworld()
  var Heightmap = Java.loadClass('net.minecraft.world.level.levelgen.Heightmap$Types')
  var BlockPos = Java.loadClass('net.minecraft.core.BlockPos')
  var y = pos.getY()
  try { y = level.getHeight(Heightmap.MOTION_BLOCKING_NO_LEAVES, pos.getX(), pos.getZ()) } catch (e) { }   // players land on the surface anyway
  level.setDefaultSpawnPos(new BlockPos(pos.getX(), y, pos.getZ()), 0.0)
  log('the capital is at ' + pos.getX() + ',' + pos.getZ() + ' but spawn was not in it — spawn moved there; walling it in 30 s')
  // the wall reads the capital at spawn; give the new spawn chunks time to load first
  server.scheduleInTicks(600, () => server.runCommandSilent('peacock wall'))
}

// game ticks since the world was created, or null if no route to the clock works here (see the header)
function worldAge(level) {
  var routes = [
    ['getGameTime', () => level.getGameTime()],
    ['m_46467_', () => level.m_46467_()],
    ['levelData.getGameTime', () => level.getLevelData().getGameTime()],
    ['levelData.m_6793_', () => level.getLevelData().m_6793_()],
    ['gameTime', () => level.gameTime],
  ]
  for (var i = 0; i < routes.length; i++) {
    try {
      var v = routes[i][1]()
      if (v !== undefined && v !== null && !isNaN(Number(v))) return { ticks: Number(v), via: routes[i][0] }
    } catch (e) { }
  }
  return null
}

function tries() {
  try { var d = JsonIO.read(COUNT); return d && d.tries ? Number(d.tries) : 0 } catch (e) { return 0 }
}

PlayerEvents.loggedIn(event => { event.server.persistentData.putBoolean('peacock_had_players', true) })

ServerEvents.loaded(event => {
  if (!ON) return
  var server = event.server
  server.scheduleInTicks(300, () => {
    var stopping = false
    try {
      var log = m => console.info('[peacock] reroll: ' + m)
      var pd = server.persistentData
      var firstBoot = !pd.getBoolean('peacock_booted')
      // marked "booted" only once this world is KEPT (finally, below). A world stopped for a reroll stays unmarked, so
      // if the start script does not delete it (2026-10-19 afternoon: it did not, reason lost with the console), the
      // next start checks it again instead of taking it for an existing world.
      var clock = worldAge(server.overworld())
      var age = clock ? clock.ticks : -1
      var fresh = firstBoot && (!clock || age <= NEW_WORLD_TICKS)
      log('first boot: ' + firstBoot + '; world age: ' + (clock ? age + ' ticks (' + clock.via + ')' : 'unreadable') + ' — ' + (fresh ? 'a new world' : 'an existing world'))
      var cap = capitalAtSpawn(server)
      if (!cap && fresh) {
        var found = null
        try { found = locateCapital(server) } catch (e) { log('locate failed — ' + e) }
        if (found) cap = { x: found.getX() >> 4, z: found.getZ() >> 4, pos: found }
      }
      var why = 'no capital on this seed'
      if (cap) {
        var near = false
        if (fresh && cap.x !== undefined) {
          try { near = towerNear(server, cap.x, cap.z) } catch (e) { log('tower check failed — ' + e) }
        }
        if (!near) {
          if (cap.pos) moveSpawnTo(server, cap.pos, log)
          if (tries() > 0) { log('capital found after ' + tries() + ' reroll(s)'); JsonIO.write(COUNT, { tries: 0 }) }
          return
        }
        why = 'a Village Recruits tower can generate within ' + VR_CLEAR + ' chunks of the capital (chunk ' + cap.x + ',' + cap.z + ')'
      }
      // keeping this world after all: still put spawn in the capital if it was found elsewhere
      var keep = m => { log(why + ', but ' + m + '; keeping this world'); if (cap && cap.pos) moveSpawnTo(server, cap.pos, log) }
      if (!fresh) return                                                  // an old world: never touched
      if (server.persistentData.getBoolean('peacock_had_players')) { keep('someone has joined it'); return }
      if (server.players.size() > 0) { keep('someone is online'); return }
      var n = tries()
      if (n >= MAX_TRIES) { keep(n + ' rerolls in a row'); JsonIO.write(COUNT, { tries: 0 }); return }
      JsonIO.write(MARKER, { reroll: true, attempt: n + 1, worldTicks: Number(age) })
      JsonIO.write(COUNT, { tries: n + 1 })   // here too, not only in the start script: a killed stop still counts
      var check = null
      try { check = JsonIO.read(MARKER) } catch (e) { }
      if (!check || !check.reroll) { keep('the reroll marker could not be written to ' + MARKER); return }
      log(why + ' (new world, never joined) — attempt ' + (n + 1) + ' of ' + MAX_TRIES + ', stopping for a new seed')
      stopping = true
      pd.putBoolean('peacock_booted', false)
      server.runCommandSilent('stop')
    } catch (e) { console.error('[peacock] reroll: failed — ' + e) }
    finally { if (!stopping) server.persistentData.putBoolean('peacock_booted', true) }
  })
})
})()
