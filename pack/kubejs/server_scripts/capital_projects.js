// Peacock — the Capital Works: projects everyone pays into, buildings that change the world (2026-10-22).
//
// Aaron: "Can you try and ship it all?" A Clerk stands on the capital's square beside a lectern. Talk to her: she shows
// the current project, what it still needs (emeralds and materials), who has given most, and takes donations (from
// your hand, or everything in your pack that fits). When a project's needs are met, its building goes up outside the
// capital's wall — open ground the script finds, levelled and built in place like the bounty pavilions — and the
// people who work there move in:
//   1 The Forge          the Smith            5 The Infirmary      the Physician, the Undertaker, a graveyard
//   2 The Scriptorium    the Scribe           6 The Rail Station   the Courier
//   3 The Hall of Heroes the Chronicler       7 The Lighthouse     the Keeper, and a beacon beam over the capital
//   4 The Market         the Exchange, stalls 8 Relight a Dead Town: the nearest abandoned ruin is cleared, its zombie
//                                               villagers cured, a bell, beds, a bounty board and settlers moved in
// Since 2026-10-28 the buildings stand from the start as ruins on planned lots inside a wall grown around them, joined
// by roads (capital_layout.js); paying for one restores its ruin. The Hall of Heroes (boss_record.js) was added then.
// The Clerk also sells the Steward's Contract (steward.js). `/peacock projects` shows progress anywhere;
// `/peacock projects finish` (op) completes the current project at once (for testing or a stuck server).
// persistentData `peacock_works`: v (2), done ("forge,scriptorium,…"), progress.<id>.<need index>, donors.<name>,
// pending (paid for, not yet built), sites.<id> ("x,y,z"), ruins.<id> (1 while it is a ruin), boxes.
// Until 2026-10-28 progress was one `given` list by need index that was never cleared when a project finished, so the
// next project started with the last one's counts (the Scriptorium needed 16 emeralds and nothing else); `migrate`.
// Services: capital_services.js; framework: capital_npcs.js.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants,
// every loop variable declared before its loops.
;(() => {
const R = global.PEACOCK_ROLES = global.PEACOCK_ROLES || {}
const WORKS = 'peacock_works'
const CLERK = 'peacock_clerk'
const OW = 'minecraft:overworld'
const GROUND = /^minecraft:(grass_block|dirt|coarse_dirt|rooted_dirt|podzol|mycelium|moss_block|sand|red_sand|gravel|stone|cobblestone|mossy_cobblestone|andesite|diorite|granite|tuff|calcite|clay|snow_block|dirt_path|farmland|packed_mud|terracotta|sandstone)$/
const SOFT = /^([a-z0-9_.-]+:[a-z0-9_/.-]*(_leaves|_log|_wood|_sapling|_carpet)|minecraft:(air|cave_air|grass|tall_grass|fern|large_fern|dandelion|poppy|blue_orchid|allium|azure_bluet|red_tulip|orange_tulip|white_tulip|pink_tulip|oxeye_daisy|cornflower|lily_of_the_valley|sunflower|lilac|rose_bush|peony|snow|dead_bush|sweet_berry_bush|pink_petals|vine|glow_lichen|bee_nest|brown_mushroom|red_mushroom|pumpkin|melon))$/

// ---------------------------------------------------------------- the projects
// needs: [item id or #tag, count, label]. Progress is stored by project id and need index, so new needs go at the END.
// 2026-10-27: cave goods added to the Infirmary (glow berries), the Station (deepslate ballast) and the Lighthouse (amethyst
// for the lens), so the server's projects send people underground.
const PROJECTS = [
  { id: 'forge', name: 'The Forge', does: 'a smithy, and the Smith: repairs without XP, anvil penalties cleared, renaming',
    needs: [['minecraft:emerald', 48, 'emeralds'], ['minecraft:stone_bricks', 96, 'stone bricks'], ['minecraft:iron_ingot', 24, 'iron ingots'], ['#minecraft:logs', 32, 'logs']] },
  { id: 'scriptorium', name: 'The Scriptorium', does: 'a library, and the Scribe: Blueprint copies for teammates, books and maps copied',
    needs: [['minecraft:emerald', 64, 'emeralds'], ['#minecraft:planks', 96, 'planks'], ['minecraft:book', 24, 'books'], ['#minecraft:logs', 16, 'logs']] },
  { id: 'hall', name: 'The Hall of Heroes', does: 'a hall with a plaque for every boss and who brought it down first, and the Chronicler, who keeps the record',
    needs: [['minecraft:emerald', 96, 'emeralds'], ['minecraft:stone_bricks', 128, 'stone bricks'], ['#minecraft:logs', 32, 'logs'], ['minecraft:glass', 16, 'glass'], ['minecraft:gold_ingot', 8, 'gold ingots']] },
  { id: 'market', name: 'The Market', does: 'a market hall with stalls for your shops, and the Exchange Merchant: ore from other regions, saplings, patterns, trims',
    needs: [['minecraft:emerald', 128, 'emeralds'], ['#minecraft:logs', 96, 'logs'], ['minecraft:stone_bricks', 128, 'stone bricks'], ['create:andesite_alloy', 32, 'andesite alloy'], ['#minecraft:wool', 32, 'wool']] },
  { id: 'infirmary', name: 'The Infirmary', does: 'a physician\'s house and a graveyard: the Physician (cures, curing zombie villagers) and the Undertaker (your corpse brought home)',
    needs: [['minecraft:emerald', 128, 'emeralds'], ['#minecraft:wool', 48, 'wool'], ['minecraft:golden_carrot', 32, 'golden carrots'], ['minecraft:glass', 32, 'glass'], ['minecraft:stone_bricks', 96, 'stone bricks'], ['minecraft:glow_berries', 32, 'glow berries']] },
  { id: 'station', name: 'The Rail Station', does: 'a station on the capital\'s edge, and the Courier: parcels to any player, by rail',
    needs: [['minecraft:emerald', 192, 'emeralds'], ['minecraft:stone_bricks', 160, 'stone bricks'], ['minecraft:iron_ingot', 64, 'iron ingots'], ['create:andesite_casing', 32, 'andesite casings'], ['create:track', 48, 'train tracks'], ['minecraft:cobbled_deepslate', 128, 'cobbled deepslate']] },
  { id: 'lighthouse', name: 'The Lighthouse', does: 'a lit tower with a beacon beam you can see from far off, and the Keeper: a compass that always points home',
    needs: [['minecraft:emerald', 256, 'emeralds'], ['minecraft:stone_bricks', 256, 'stone bricks'], ['minecraft:glass', 48, 'glass'], ['minecraft:iron_block', 9, 'iron blocks'], ['minecraft:glowstone', 16, 'glowstone'], ['minecraft:amethyst_shard', 32, 'amethyst shards']] },
  { id: 'relight', name: 'Relight a Dead Town', does: 'the nearest abandoned ruin lives again: zombies cleared, its zombie villagers cured, a bell, beds, a bounty board and settlers',
    needs: [['minecraft:emerald', 384, 'emeralds'], ['minecraft:bread', 192, 'bread'], ['minecraft:golden_apple', 16, 'golden apples'], ['#minecraft:beds', 12, 'beds'], ['#minecraft:planks', 128, 'planks']] },
]

function works(server) { return migrate(server.persistentData.getCompound(WORKS)) }
function save(server, w) { server.persistentData.put(WORKS, w) }
function doneList(w) { var s = String(w.getString('done') || ''); return s ? s.split(',') : [] }
function isDone(w, id) { return doneList(w).indexOf(id) >= 0 }
function current(w) { for (var i = 0; i < PROJECTS.length; i++) if (!isDone(w, PROJECTS[i].id)) return i; return -1 }
function given(w, id, k) { return w.getCompound('progress').getCompound(id).getInt(String(k)) }
function setGiven(w, id, k, n) { var pr = w.getCompound('progress'), c = pr.getCompound(id); c.putInt(String(k), n); pr.put(id, c); w.put('progress', pr) }
function credit(w, name, points) { var d = w.getCompound('donors'); d.putInt(name, d.getInt(name) + points); w.put('donors', d) }
function complete(w, p) { return p.needs.every((n, k) => given(w, p.id, k) >= n[1]) }

// from the first layout (index + one `given` list) to v2. The old list carried each finished project's counts into the
// next: given[k] after a project = max(given[k] before, its need k). What the current project holds beyond that carry
// was really given for it, and is kept.
const OLD_ORDER = ['forge', 'scriptorium', 'market', 'infirmary', 'station', 'lighthouse', 'relight']
function migrate(w) {
  if (w.getInt('v') >= 2) return w
  var idx = w.getInt('index'), done = OLD_ORDER.slice(0, Math.min(idx, OLD_ORDER.length)), carry = {}, k
  done.forEach(id => { PROJECTS.filter(q => q.id === id)[0].needs.forEach((n, j) => { carry[j] = Math.max(carry[j] || 0, n[1]) }) })
  w.putString('done', done.join(','))
  if (idx < OLD_ORDER.length) {
    var cur = PROJECTS.filter(q => q.id === OLD_ORDER[idx])[0], g = w.getCompound('given')
    for (k = 0; k < cur.needs.length; k++) {
      var real = Math.max(0, g.getInt(String(k)) - (carry[k] || 0))
      if (real > 0) setGiven(w, cur.id, k, Math.min(real, cur.needs[k][1]))
    }
  }
  w.remove('given'); w.remove('index')
  w.putInt('v', 2)
  return w
}
function matches(stack, need) {
  if (stack.isEmpty()) return false
  if (need.charAt(0) !== '#') return String(stack.id) === need
  try { return !!stack.hasTag(need.substring(1)) } catch (e) { return false }
}
function everyone(server, msg) { server.players.forEach(p => p.tell(msg)) }

// ---------------------------------------------------------------- the capital, and room outside its wall
function capitalStart(level) {
  var Registries = Java.loadClass('net.minecraft.core.registries.Registries')
  var RL = Java.loadClass('net.minecraft.resources.ResourceLocation')
  var s = level.registryAccess().registryOrThrow(Registries.STRUCTURE).get(new RL('peacock', 'capital'))
  if (!s) return null
  var start = level.structureManager().getStructureAt(level.getSharedSpawnPos(), s)
  return start && start.isValid() ? start : null
}
function groundY(level, x, z, top, bottom) {
  for (var y = top; y > bottom; y--) {
    var id = String(level.getBlock(x, y, z).id)
    if (SOFT.test(id)) continue
    return GROUND.test(id) ? y + 1 : null
  }
  return null
}
function boxes(w) {
  var s = String(w.getString('boxes') || '')
  return s ? s.split(';').map(t => t.split(',').map(Number)) : []
}
function addBox(w, b) { var s = String(w.getString('boxes') || ''); w.putString('boxes', (s ? s + ';' : '') + b.join(',')) }
// a footprint of (2hx+1) x (2hz+1) open ground, at most 4 blocks of rise, outside the capital (its pieces' bounding box
// plus 8, so clear of the wall), clear of other Works buildings; nearest the capital first
function findSite(level, w, hx, hz) {
  var start = capitalStart(level)
  var sp = level.getSharedSpawnPos()
  var bb = start ? start.getBoundingBox() : null
  var x0 = bb ? bb.minX() : sp.getX() - 40, x1 = bb ? bb.maxX() : sp.getX() + 40
  var z0 = bb ? bb.minZ() : sp.getZ() - 40, z1 = bb ? bb.maxZ() : sp.getZ() + 40
  var top = sp.getY() + 40, bottom = sp.getY() - 30
  var taken = boxes(w), d, t, k, cells, dx, dz
  for (d = 8; d <= 80; d += 4) {
    var cands = []
    for (t = x0; t <= x1; t += 6) { cands.push([t, z0 - d - hz]); cands.push([t, z1 + d + hz]) }
    for (t = z0; t <= z1; t += 6) { cands.push([x0 - d - hx, t]); cands.push([x1 + d + hx, t]) }
    for (k = 0; k < cands.length; k++) {
      var cx = cands[k][0], cz = cands[k][1]
      var clash = taken.some(b => cx + hx + 4 >= b[0] && cx - hx - 4 <= b[2] && cz + hz + 4 >= b[1] && cz - hz - 4 <= b[3])
      if (clash) continue
      var ys = [], ok = true
      cells = [[0, 0], [-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]]
      for (dx = -hx; dx <= hx; dx += 2) for (dz = -hz; dz <= hz; dz += 2) cells.push([dx, dz])
      for (var c = 0; c < cells.length && ok; c++) {
        var y = groundY(level, cx + cells[c][0], cz + cells[c][1], top, bottom)
        if (y === null) ok = false
        else { ys.push(y); if (Math.max.apply(null, ys) - Math.min.apply(null, ys) > 4) ok = false }
      }
      if (!ok) continue
      ys.sort((a, b) => a - b)
      return { x: cx, y: ys[ys.length >> 1], z: cz }
    }
  }
  return null
}

// ---------------------------------------------------------------- building with commands
function cmd(server, c) { server.runCommandSilent('execute in ' + OW + ' run ' + c) }
function fill(server, x0, y0, z0, x1, y1, z1, block, mode) { cmd(server, 'fill ' + x0 + ' ' + y0 + ' ' + z0 + ' ' + x1 + ' ' + y1 + ' ' + z1 + ' ' + block + (mode ? ' ' + mode : '')) }
function put(server, x, y, z, block) { cmd(server, 'setblock ' + x + ' ' + y + ' ' + z + ' ' + block) }
function signText(l1, l2, l3, l4) {
  var m = (t, bold) => "'" + JSON.stringify({ text: t || '', bold: !!bold }) + "'"
  return '{front_text:{messages:[' + [m(l1, true), m(l2), m(l3), m(l4)].join(',') + ']},is_waxed:1b}'
}
function sign(server, x, y, z, facing, l1, l2) {
  var m = t => "'" + JSON.stringify({ text: t || '' }) + "'"
  var mb = t => "'" + JSON.stringify({ text: t || '', bold: true }) + "'"
  var text = 'messages:[' + [m(''), mb(l1), m(l2), m('')].join(',') + ']'
  put(server, x, y, z, 'minecraft:oak_wall_sign[facing=' + facing + ']{front_text:{' + text + '},is_waxed:1b}')
}
// clear the site, lay a floor at y-1 and fill anything open below it
function groundwork(server, s, hx, hz, height, floor) {
  fill(server, s.x - hx - 1, s.y, s.z - hz - 1, s.x + hx + 1, s.y + height, s.z + hz + 1, 'minecraft:air')
  fill(server, s.x - hx - 1, s.y - 1, s.z - hz - 1, s.x + hx + 1, s.y - 1, s.z + hz + 1, 'minecraft:stone_bricks')
  fill(server, s.x - hx, s.y - 1, s.z - hz, s.x + hx, s.y - 1, s.z + hz, floor || 'minecraft:spruce_planks')
  fill(server, s.x - hx - 1, s.y - 7, s.z - hz - 1, s.x + hx + 1, s.y - 2, s.z + hz + 1, 'minecraft:cobblestone', 'replace minecraft:air')
  fill(server, s.x - hx - 1, s.y - 7, s.z - hz - 1, s.x + hx + 1, s.y - 2, s.z + hz + 1, 'minecraft:cobblestone', 'replace minecraft:water')
}
// walls h high, log corners, a door in the south wall, windows (at height `win`, default 1), and a gable roof along x;
// front faces south (+z)
function house(server, s, hx, hz, h, wall, log, roof, door, win) {
  var x0 = s.x - hx, x1 = s.x + hx, z0 = s.z - hz, z1 = s.z + hz, y = s.y, i, t, wy = y + (win || 1)
  fill(server, x0, y, z0, x1, y + h - 1, z0, wall); fill(server, x0, y, z1, x1, y + h - 1, z1, wall)
  fill(server, x0, y, z0, x0, y + h - 1, z1, wall); fill(server, x1, y, z0, x1, y + h - 1, z1, wall)
  ;[[x0, z0], [x1, z0], [x0, z1], [x1, z1]].forEach(c => fill(server, c[0], y, c[1], c[0], y + h - 1, c[1], log + '[axis=y]'))
  for (t = x0 + 2; t <= x1 - 2; t += 2) { put(server, t, wy, z0, 'minecraft:glass_pane'); if (Math.abs(t - s.x) > 1) put(server, t, wy, z1, 'minecraft:glass_pane') }
  for (t = z0 + 2; t <= z1 - 2; t += 2) { put(server, x0, wy, t, 'minecraft:glass_pane'); put(server, x1, wy, t, 'minecraft:glass_pane') }
  if (door !== false) {
    put(server, s.x, y, z1, 'minecraft:' + (door || 'spruce') + '_door[facing=north,half=lower,hinge=left]')
    put(server, s.x, y + 1, z1, 'minecraft:' + (door || 'spruce') + '_door[facing=north,half=upper,hinge=left]')
  }
  for (i = 0; z0 - 1 + i < z1 + 1 - i; i++) {
    fill(server, x0 - 1, y + h + i, z0 - 1 + i, x1 + 1, y + h + i, z0 - 1 + i, roof + '_stairs[facing=south]')
    fill(server, x0 - 1, y + h + i, z1 + 1 - i, x1 + 1, y + h + i, z1 + 1 - i, roof + '_stairs[facing=north]')
    if (z0 + i <= z1 - i) { fill(server, x0, y + h + i, z0 + i, x0, y + h + i, z1 - i, wall); fill(server, x1, y + h + i, z0 + i, x1, y + h + i, z1 - i, wall) }
  }
  if (z0 - 1 + i === z1 + 1 - i) fill(server, x0 - 1, y + h + i, z0 - 1 + i, x1 + 1, y + h + i, z0 - 1 + i, roof + '_slab[type=bottom]')
  put(server, s.x, y + h - 1, s.z, 'minecraft:lantern[hanging=true]')
}
function bed(server, x, y, z, color) {
  put(server, x, y, z, 'minecraft:' + color + '_bed[facing=south,part=foot]')
  put(server, x, y, z - 1, 'minecraft:' + color + '_bed[facing=south,part=head]')
}

// each returns where its people stand: [[role, x, y, z, yaw], …]
const BUILD = {
  forge: (server, w, s) => {
    groundwork(server, s, 4, 3, 10, 'minecraft:polished_andesite')
    house(server, s, 4, 3, 4, 'minecraft:stone_bricks', 'minecraft:spruce_log', 'minecraft:spruce', false)
    fill(server, s.x - 3, s.y, s.z + 3, s.x + 3, s.y + 2, s.z + 3, 'minecraft:air')                 // the open front
    put(server, s.x - 3, s.y, s.z - 2, 'minecraft:anvil[facing=east]'); put(server, s.x - 1, s.y, s.z - 2, 'minecraft:smithing_table')
    put(server, s.x + 1, s.y, s.z - 2, 'minecraft:blast_furnace[facing=south]'); put(server, s.x + 3, s.y, s.z - 2, 'minecraft:lava_cauldron')
    put(server, s.x + 3, s.y, s.z, 'minecraft:grindstone[face=floor,facing=west]')
    fill(server, s.x + 4, s.y + 4, s.z - 3, s.x + 4, s.y + 8, s.z - 3, 'minecraft:bricks')
    put(server, s.x + 4, s.y + 9, s.z - 3, 'minecraft:campfire[lit=true,signal_fire=true]')
    sign(server, s.x - 4, s.y + 2, s.z + 4, 'south', 'The Forge', 'Capital Works')
    return [['smith', s.x, s.y, s.z, 0]]
  },
  scriptorium: (server, w, s) => {
    groundwork(server, s, 4, 3, 10)
    house(server, s, 4, 3, 4, 'minecraft:birch_planks', 'minecraft:spruce_log', 'minecraft:dark_oak')
    fill(server, s.x - 3, s.y, s.z - 2, s.x + 3, s.y + 2, s.z - 2, 'minecraft:bookshelf')
    put(server, s.x - 2, s.y, s.z, 'minecraft:lectern[facing=south]'); put(server, s.x + 2, s.y, s.z, 'minecraft:cartography_table')
    sign(server, s.x + 1, s.y + 2, s.z + 4, 'south', 'Scriptorium', 'Capital Works')
    return [['scribe', s.x, s.y, s.z + 1, 0]]
  },
  // the Hall of Heroes: a plaque for every boss (boss_record.js) on the inside walls, windows above them
  hall: (server, w, s) => {
    var z
    groundwork(server, s, 6, 4, 10, 'minecraft:polished_andesite')
    house(server, s, 6, 4, 5, 'minecraft:stone_bricks', 'minecraft:dark_oak_log', 'minecraft:dark_oak', 'dark_oak', 3)
    for (z = s.z - 3; z <= s.z + 3; z++) put(server, s.x, s.y, z, 'minecraft:red_carpet')
    sign(server, s.x + 1, s.y + 2, s.z + 5, 'south', 'Hall of Heroes', 'Capital Works')
    server.scheduleInTicks(5, () => hallRefresh(server))
    return [['chronicler', s.x, s.y, s.z - 2, 0]]
  },
  market: (server, w, s) => {
    var x, z
    groundwork(server, s, 8, 5, 10, 'minecraft:stone_bricks')
    for (x = s.x - 8; x <= s.x + 8; x += 4) { fill(server, x, s.y, s.z - 5, x, s.y + 3, s.z - 5, 'minecraft:oak_log[axis=y]'); fill(server, x, s.y, s.z + 5, x, s.y + 3, s.z + 5, 'minecraft:oak_log[axis=y]') }
    house(server, { x: s.x, y: s.y + 4, z: s.z }, 8, 5, 0, 'minecraft:oak_planks', 'minecraft:oak_log', 'minecraft:spruce', false)
    for (x = s.x - 6; x <= s.x + 6; x += 4) for (z = s.z - 3; z <= s.z + 3; z += 6) {
      put(server, x, s.y, z, 'minecraft:barrel[facing=up]'); put(server, x + 1, s.y, z, 'minecraft:oak_fence'); put(server, x + 1, s.y + 1, z, 'minecraft:oak_pressure_plate')
      put(server, x, s.y + 2, z, 'minecraft:lantern[hanging=false]')
    }
    sign(server, s.x - 4, s.y + 2, s.z + 6, 'south', 'The Market', 'stalls: yours to keep')
    return [['exchange', s.x, s.y, s.z, 0]]
  },
  infirmary: (server, w, s) => {
    var gx = s.x + 11, i
    groundwork(server, s, 5, 3, 10, 'minecraft:smooth_stone')
    house(server, s, 5, 3, 4, 'minecraft:white_terracotta', 'minecraft:stripped_birch_log', 'minecraft:stone_brick')
    for (i = -4; i <= 4; i += 2) if (i !== 0) bed(server, s.x + i, s.y, s.z - 1, 'white')
    put(server, s.x - 4, s.y, s.z + 2, 'minecraft:brewing_stand'); put(server, s.x + 4, s.y, s.z + 2, 'minecraft:water_cauldron[level=3]')
    sign(server, s.x - 1, s.y + 2, s.z + 4, 'south', 'Infirmary', 'Capital Works')
    // the graveyard, east
    groundwork(server, { x: gx, y: s.y, z: s.z }, 4, 3, 4, 'minecraft:coarse_dirt')
    fill(server, gx - 4, s.y, s.z - 3, gx + 4, s.y, s.z + 3, 'minecraft:spruce_fence', 'outline')
    put(server, gx, s.y, s.z + 3, 'minecraft:spruce_fence_gate[facing=south]')
    for (i = -2; i <= 2; i += 2) { put(server, gx + i, s.y, s.z - 1, 'minecraft:mossy_cobblestone_wall'); put(server, gx + i, s.y, s.z + 1, 'minecraft:cobblestone_wall') }
    w.putString('graveyard', gx + ',' + s.y + ',' + s.z)
    server.persistentData.putString('peacock_graveyard', gx + ',' + s.y + ',' + s.z)
    return [['physician', s.x - 2, s.y, s.z + 1, 0], ['undertaker', gx + 3, s.y, s.z + 2, 270]]
  },
  station: (server, w, s) => {
    var x
    groundwork(server, s, 7, 3, 8, 'minecraft:smooth_stone')
    fill(server, s.x - 8, s.y - 1, s.z - 4, s.x + 8, s.y - 1, s.z - 4, 'minecraft:gravel')
    fill(server, s.x - 8, s.y, s.z - 4, s.x + 8, s.y, s.z - 4, 'create:track[shape=xo]')
    for (x = s.x - 6; x <= s.x + 6; x += 4) { fill(server, x, s.y, s.z - 2, x, s.y + 3, s.z - 2, 'minecraft:spruce_log[axis=y]'); fill(server, x, s.y, s.z + 2, x, s.y + 3, s.z + 2, 'minecraft:spruce_log[axis=y]') }
    fill(server, s.x - 7, s.y + 4, s.z - 3, s.x + 7, s.y + 4, s.z + 3, 'minecraft:spruce_slab[type=bottom]')
    for (x = s.x - 5; x <= s.x + 5; x += 5) put(server, x, s.y, s.z + 1, 'minecraft:spruce_stairs[facing=south]')
    put(server, s.x + 2, s.y + 3, s.z, 'minecraft:lantern[hanging=true]'); put(server, s.x - 2, s.y + 3, s.z, 'minecraft:lantern[hanging=true]')
    sign(server, s.x + 2, s.y + 2, s.z + 3, 'south', 'Capital Station', 'parcels: see the Courier')
    return [['courier', s.x, s.y, s.z, 0]]
  },
  lighthouse: (server, w, s) => {
    var y, band, x, z
    groundwork(server, s, 3, 3, 28, 'minecraft:stone_bricks')
    for (y = s.y; y < s.y + 20; y++) {
      band = Math.floor((y - s.y) / 4) % 2 ? 'minecraft:red_terracotta' : 'minecraft:white_terracotta'
      fill(server, s.x - 2, y, s.z - 2, s.x + 2, y, s.z + 2, band, 'outline')
      fill(server, s.x - 1, y, s.z - 1, s.x + 1, y, s.z + 1, 'minecraft:air')
    }
    fill(server, s.x, s.y, s.z - 1, s.x, s.y + 19, s.z - 1, 'minecraft:ladder[facing=south]')
    put(server, s.x, s.y, s.z + 2, 'minecraft:spruce_door[facing=north,half=lower,hinge=left]'); put(server, s.x, s.y + 1, s.z + 2, 'minecraft:spruce_door[facing=north,half=upper,hinge=left]')
    fill(server, s.x - 2, s.y + 20, s.z - 2, s.x + 2, s.y + 20, s.z + 2, 'minecraft:stone_bricks')
    fill(server, s.x - 1, s.y + 20, s.z - 1, s.x + 1, s.y + 20, s.z + 1, 'minecraft:iron_block')    // the beacon's base
    fill(server, s.x - 2, s.y + 21, s.z - 2, s.x + 2, s.y + 23, s.z + 2, 'minecraft:glass', 'outline')
    for (x = -2; x <= 2; x += 4) for (z = -2; z <= 2; z += 4) put(server, s.x + x, s.y + 21, s.z + z, 'minecraft:sea_lantern')
    fill(server, s.x - 1, s.y + 21, s.z - 1, s.x + 1, s.y + 23, s.z + 1, 'minecraft:air')
    put(server, s.x, s.y + 21, s.z, 'minecraft:beacon')
    sign(server, s.x + 1, s.y + 2, s.z + 3, 'south', 'Lighthouse', 'Capital Works')
    w.putString('lamp', s.x + ',' + (s.y + 21) + ',' + s.z)
    server.persistentData.putString('peacock_lighthouse_lamp', s.x + ',' + (s.y + 21) + ',' + s.z)
    return [['keeper', s.x + 2, s.y, s.z + 4, 0]]
  },
}
const SIZE = { forge: [5, 4], scriptorium: [5, 4], hall: [7, 5], market: [9, 6], infirmary: [16, 4], station: [8, 5], lighthouse: [4, 5] }
// everything each building touches, from its centre: [x0, z0, x1, z1] (groundwork, roof overhang, chimney, graveyard,
// signs); its front, where the road meets it, is the middle of the south side, one block out. `height`: what the builder
// clears above the floor. `outside`: not walled in (the Lighthouse).
const FOOT = {
  forge: { box: [-5, -4, 5, 4], height: 10 }, scriptorium: { box: [-5, -4, 5, 4], height: 10 }, hall: { box: [-7, -5, 7, 5], height: 10 },
  market: { box: [-9, -6, 9, 6], height: 10 }, infirmary: { box: [-6, -4, 16, 4], height: 10 }, station: { box: [-8, -4, 8, 4], height: 8 },
  lighthouse: { box: [-4, -4, 4, 4], height: 28, outside: true },
}

// ---------------------------------------------------------------- the Hall of Heroes' plaques
// birch wall signs on the inside walls, rows at floor+1 and floor+2: the north wall (11 across) then the west and east
// walls (5 each), in boss_record.js' order
function hallSlots(s) {
  var out = [], x, z, r
  for (r = 1; r <= 2; r++) for (x = s.x - 5; x <= s.x + 5; x++) out.push([x, s.y + r, s.z - 3, 'south'])
  for (r = 1; r <= 2; r++) for (z = s.z - 2; z <= s.z + 2; z++) out.push([s.x - 5, s.y + r, z, 'east'])
  for (r = 1; r <= 2; r++) for (z = s.z - 2; z <= s.z + 2; z++) out.push([s.x + 5, s.y + r, z, 'west'])
  return out
}
function hallRefresh(server) {
  var w = works(server), at = String(w.getCompound('sites').getString('hall') || '')
  if (!at || w.getCompound('ruins').getInt('hall') || !isDone(w, 'hall') || !global.PEACOCK_RECORD) return
  var c = at.split(',').map(Number), s = { x: c[0], y: c[1], z: c[2] }, level = server.overworld()
  try { if (!level.hasChunk(s.x >> 4, s.z >> 4)) return } catch (e) { }
  var slots = hallSlots(s)
  global.PEACOCK_RECORD.LIST.forEach((b, i) => {
    if (i >= slots.length) return
    var q = global.PEACOCK_RECORD.plaque(server, b[0]), sl = slots[i]
    var m = (t, bold, gray) => "'" + JSON.stringify({ text: t || '', bold: !!bold, color: gray ? 'gray' : 'black' }) + "'"
    var text = 'messages:[' + [m(q.lines[0], true, !q.done), m(q.lines[1], false, !q.done), m(q.lines[2], false, !q.done), m(q.lines[3], false, !q.done)].join(',') + ']'
    put(server, sl[0], sl[1], sl[2], 'minecraft:birch_wall_sign[facing=' + sl[3] + ']{front_text:{' + text + '},is_waxed:1b}')
  })
}
global.PEACOCK_HALL_REFRESH = hallRefresh

// ---------------------------------------------------------------- relight a dead town
function relight(server, w, done) {
  var level = server.overworld()
  var Registries = Java.loadClass('net.minecraft.core.registries.Registries')
  var RL = Java.loadClass('net.minecraft.resources.ResourceLocation')
  var TagKey = Java.loadClass('net.minecraft.tags.TagKey')
  var reg = level.registryAccess().registryOrThrow(Registries.STRUCTURE)
  var set = reg.getTag(TagKey.create(Registries.STRUCTURE, new RL('peacock', 'ruins_abandoned')))
  if (!set.isPresent()) { console.warn('[peacock] works: no #peacock:ruins_abandoned tag'); done(false); return }
  var pair = level.getChunkSource().getGenerator().findNearestMapStructure(level, set.get(), level.getSharedSpawnPos(), 100, false)
  if (!pair) { console.warn('[peacock] works: no abandoned ruin within 1600 blocks'); done(false); return }
  var at = pair.getFirst(), st = pair.getSecond().value()
  var start = level.structureManager().getStructureAt(at, st)
  if (!start || !start.isValid()) { console.warn('[peacock] works: ruin start not found at ' + at); done(false); return }
  var bb = start.getBoundingBox()
  var x0 = bb.minX(), x1 = bb.maxX(), z0 = bb.minZ(), z1 = bb.maxZ()
  var cx = (x0 + x1) >> 1, cz = (z0 + z1) >> 1
  cmd(server, 'forceload add ' + x0 + ' ' + z0 + ' ' + x1 + ' ' + z1)
  server.scheduleInTicks(100, () => {
    try {
      var y = groundY(level, cx, cz, bb.maxY() + 10, bb.minY() - 10) || at.getY()
      var sel = 'x=' + x0 + ',y=' + (bb.minY() - 8) + ',z=' + z0 + ',dx=' + (x1 - x0) + ',dy=' + (bb.maxY() - bb.minY() + 16) + ',dz=' + (z1 - z0)
      cmd(server, 'execute as @e[type=minecraft:zombie_villager,' + sel + '] run data merge entity @s {ConversionTime:200}')
      cmd(server, 'kill @e[type=minecraft:zombie,' + sel + ']')
      cmd(server, 'kill @e[type=minecraft:husk,' + sel + ']')
      groundwork(server, { x: cx, y: y, z: cz }, 4, 4, 5, 'minecraft:stone_bricks')
      put(server, cx, y, cz, 'minecraft:bell[attachment=floor,facing=south]')
      put(server, cx + 2, y, cz, 'bountiful:bountyboard')
      var b
      for (b = -3; b <= 3; b += 2) { bed(server, cx + b, y, cz - 2, 'yellow'); bed(server, cx + b, y, cz + 4, 'red') }
      ;['minecraft:composter', 'minecraft:lectern[facing=south]', 'minecraft:smithing_table', 'minecraft:fletching_table'].forEach((blk, i) => put(server, cx - 4 + i * 3, y, cz + 1, blk))
      fill(server, cx - 2, y, cz + 2, cx - 2, y + 4, cz + 2, 'minecraft:oak_fence')
      cmd(server, 'setblock ' + (cx - 2) + ' ' + (y + 5) + ' ' + (cz + 2) + ' minecraft:yellow_banner[rotation=0]{Patterns:[{Pattern:"mr",Color:14},{Pattern:"bo",Color:14}]} replace')
      for (b = 0; b < 6; b++) cmd(server, 'summon minecraft:villager ' + (cx + (b % 3) - 1) + ' ' + (y + 1) + ' ' + (cz + 1 + Math.floor(b / 3)) + ' {PersistenceRequired:1b}')
      server.scheduleInTicks(400, () => cmd(server, 'forceload remove ' + x0 + ' ' + z0 + ' ' + x1 + ' ' + z1))
      done(true, cx, y, cz)
    } catch (e) { console.warn('[peacock] works: relight: ' + e); done(false) }
  })
}

// ---------------------------------------------------------------- finishing a project
function finish(server, idx) {
  var w = works(server), p = PROJECTS[idx]
  var d = doneList(w); if (d.indexOf(p.id) < 0) d.push(p.id)
  w.putString('done', d.join(','))
  w.putString('pending', p.id)
  save(server, w)
  everyone(server, Text.gold('Capital Works: ').append(Text.white(p.name + ' is paid for! The builders are at work.')))
  build(server, p.id)
}
function footBox(id, s) { var f = FOOT[id].box; return [s.x + f[0], s.z + f[1], s.x + f[2], s.z + f[3]] }
function chunksOf(box, pad) {
  var out = [], a, b
  for (a = (box[0] - pad) >> 4; a <= (box[2] + pad) >> 4; a++) for (b = (box[1] - pad) >> 4; b <= (box[3] + pad) >> 4; b++) out.push([a, b])
  return out
}
function spawnPeople(server, people) {
  people.forEach(q => global.PEACOCK_NPC.spawn(server, OW, q[0], q[1] + 0.5, q[2], q[3] + 0.5, q[4],
    global.PEACOCK_ROLES[q[0]].offers ? { offers: global.PEACOCK_ROLES[q[0]].offers } : null))
}
// the chunks a job needs, loaded (capital_layout.js keeps the tickets); plain /forceload if that script is missing
function holdBox(server, box, then) {
  var L = global.PEACOCK_LAYOUT
  if (L) { L.hold(server, chunksOf(box, 2), held => then(() => L.release(server, held))); return }
  var area = (box[0] - 2) + ' ' + (box[1] - 2) + ' ' + (box[2] + 2) + ' ' + (box[3] + 2)
  cmd(server, 'forceload add ' + area)
  server.scheduleInTicks(40, () => then(() => cmd(server, 'forceload remove ' + area)))
}

function build(server, id) {
  var w = works(server)
  var p = PROJECTS.filter(q => q.id === id)[0]
  if (!p) return
  if (id === 'relight') {
    relight(server, w, (ok, x, y, z) => {
      var w2 = works(server)
      if (ok) {
        w2.putString('pending', ''); w2.putString('relit', x + ',' + y + ',' + z); save(server, w2)
        everyone(server, Text.gold('Capital Works: ').append(Text.white('A dead town lives again, at ' + x + ', ' + y + ', ' + z + '. Its bell rings; settlers are moving in.')))
      } else console.warn('[peacock] works: relight not done; tried again next start')
    })
    return
  }
  var at = String(w.getCompound('sites').getString(id) || '')
  if (at && w.getCompound('ruins').getInt(id)) { restore(server, p, at); return }
  if (at) { w.putString('pending', ''); save(server, w); return }       // already standing
  // no planned lot (the town plan could not place it): open ground outside the wall, as before 2026-10-28
  var level = server.overworld()
  var sz = SIZE[id]
  var s = findSite(level, w, sz[0], sz[1])
  if (!s) { console.warn('[peacock] works: no room found for ' + p.name + '; tried again next start'); return }
  var box = footBox(id, s)
  holdBox(server, box, release => {
    try {
      var w2 = works(server)
      spawnPeople(server, BUILD[id](server, w2, s))
      addBox(w2, box)
      var sites = w2.getCompound('sites'); sites.putString(id, s.x + ',' + s.y + ',' + s.z); w2.put('sites', sites)
      w2.putString('pending', '')
      save(server, w2)
      everyone(server, Text.gold('Capital Works: ').append(Text.white(p.name + ' stands at ' + s.x + ', ' + s.y + ', ' + s.z + ': ' + p.does + '.')))
      console.info('[peacock] works: ' + p.name + ' built at ' + s.x + ',' + s.y + ',' + s.z)
    } catch (e) { console.warn('[peacock] works: building ' + p.name + ': ' + e) }
    server.scheduleInTicks(200, release)
  })
}

// a paid-for ruin is rebuilt in place: the builder clears its lot and puts the building up whole; its people move in
function restore(server, p, at) {
  var c = at.split(',').map(Number), s = { x: c[0], y: c[1], z: c[2] }, id = p.id
  holdBox(server, footBox(id, s), release => {
    try {
      var w2 = works(server), r = w2.getCompound('ruins'); r.putInt(id, 0); w2.put('ruins', r)
      var rs = String(w2.getCompound('ruinSigns').getString(id) || '')
      if (rs) { var q = rs.split(',').map(Number); put(server, q[0], q[1], q[2], 'minecraft:air') }
      save(server, w2)
      spawnPeople(server, BUILD[id](server, works(server), s))
      var w3 = works(server); w3.putString('pending', ''); save(server, w3)
      everyone(server, Text.gold('Capital Works: ').append(Text.white(p.name + ' is restored, at ' + s.x + ', ' + s.y + ', ' + s.z + ': ' + p.does + '.')))
      console.info('[peacock] works: ' + p.name + ' restored at ' + s.x + ',' + s.y + ',' + s.z)
    } catch (e) { console.warn('[peacock] works: restoring ' + p.name + ': ' + e) }
    server.scheduleInTicks(200, release)
  })
}

global.PEACOCK_WORKS = { PROJECTS: PROJECTS, BUILD: BUILD, FOOT: FOOT, works: works, save: save, isDone: isDone,
  footBox: footBox, put: put, fill: fill, cmd: cmd, signText: (l1, l2, l3, l4) => signText(l1, l2, l3, l4) }

// ---------------------------------------------------------------- the Clerk
function status(w, api) {
  var i = current(w), out = []
  if (i < 0) { out.push(Text.gold('Capital Works: ').append(Text.white('every project is finished. The capital thanks you.'))); return out }
  var p = PROJECTS[i]
  out.push(Text.gold('Capital Works ' + (i + 1) + '/' + PROJECTS.length + ': ').append(Text.white(p.name)))
  out.push(Text.gray('  When finished: ' + p.does + '.'))
  var at = String(w.getCompound('sites').getString(p.id) || '')
  if (at && w.getCompound('ruins').getInt(p.id)) out.push(Text.gray('  Its ruin stands at ' + at.split(',').join(', ') + ', waiting.'))
  p.needs.forEach((n, k) => {
    var have = Math.min(given(w, p.id, k), n[1])
    out.push((have >= n[1] ? Text.green('  ✔ ') : Text.yellow('  • ')).append(Text.white(have + ' / ' + n[1] + ' ' + n[2])))
  })
  var d = w.getCompound('donors'), names = []
  var it = d.getAllKeys().iterator()
  while (it.hasNext()) { var k2 = String(it.next()); names.push([k2, d.getInt(k2)]) }
  names.sort((a, b) => b[1] - a[1])
  if (names.length) out.push(Text.gray('  Most generous: ' + names.slice(0, 3).map(n => n[0]).join(', ')))
  return out
}
function donateEmeralds(player, npc, n, api) {
  var server = player.server, w = works(server), i = current(w)
  if (i < 0) return
  var p = PROJECTS[i], k = -1, j
  for (j = 0; j < p.needs.length; j++) if (p.needs[j][0] === 'minecraft:emerald') k = j
  if (k < 0) return
  var want = Math.min(n, p.needs[k][1] - given(w, p.id, k))
  if (want <= 0) { api.say(player, 'Clerk', 'gold', 'The emeralds for this one are all in. It needs materials now.'); return }
  want = Math.min(want, api.countEmeralds(player))
  if (want <= 0 || !api.take(player, want)) { api.poor(player, npc, Math.min(n, p.needs[k][1] - given(w, p.id, k))); return }
  setGiven(w, p.id, k, given(w, p.id, k) + want)
  credit(w, player.username, want)
  save(server, w)
  api.say(player, 'Clerk', 'gold', want + ' emeralds, entered in the ledger. Thank you.')
  if (complete(w, p)) finish(server, i)
}
function donateItems(player, npc, heldOnly, api) {
  var server = player.server, w = works(server), i = current(w)
  if (i < 0) return
  var p = PROJECTS[i], inv = player.inventory, total = 0, slot, k
  var slots = heldOnly ? [player.selectedSlot] : []
  if (!heldOnly) for (slot = 0; slot < 36; slot++) slots.push(slot)
  slots.forEach(sl => {
    var st = inv.getItem(sl)
    if (st.isEmpty()) return
    for (k = 0; k < p.needs.length; k++) {
      var n = p.needs[k]
      if (n[0] === 'minecraft:emerald' || !matches(st, n[0])) continue
      var room = n[1] - given(w, p.id, k)
      if (room <= 0) continue
      var m = Math.min(room, st.count)
      st.shrink(m)
      setGiven(w, p.id, k, given(w, p.id, k) + m)
      total += m
      break
    }
  })
  if (!total) { api.say(player, 'Clerk', 'gold', heldOnly ? 'The project does not need that, or has enough of it.' : 'Nothing in your pack is on the list.'); return }
  credit(w, player.username, Math.ceil(total / 4))
  save(server, w)
  api.say(player, 'Clerk', 'gold', total + ' item' + (total === 1 ? '' : 's') + ' for ' + p.name + '. The builders will be glad.')
  if (complete(w, p)) finish(server, i)
}
R.clerk = {
  name: 'Clerk of the Works', color: 'gold', profession: 'minecraft:librarian',
  menu: (player, npc, api) => {
    var w = works(player.server)
    status(w, api).forEach(t => player.tell(t))
    if (current(w) >= 0) player.tell(api.line([
      api.button('Give 16 emeralds', '/peacock npc give16'), api.button('Give 64', '/peacock npc give64'),
      api.button('Give what I hold', '/peacock npc held'), api.button('Give all that fits', '/peacock npc all', 'Every listed material in your pack.'),
    ]))
    player.tell(api.line([api.button("Steward's Contract: 16 emeralds", '/peacock npc contract', 'A steward keeps your land running while you are away (paid daily).')]))
  },
  actions: {
    give16: (player, npc, arg, api) => donateEmeralds(player, npc, 16, api),
    give64: (player, npc, arg, api) => donateEmeralds(player, npc, 64, api),
    held: (player, npc, arg, api) => donateItems(player, npc, true, api),
    all: (player, npc, arg, api) => donateItems(player, npc, false, api),
    contract: (player, npc, arg, api) => {
      if (!api.take(player, 16)) { api.poor(player, npc, 16); return }
      player.give(Item.of('peacock:steward_contract'))
      api.say(player, 'Clerk', 'gold', 'Signed. Use it where your steward should live, and keep his purse full.')
    },
  },
}

// the Clerk, a lectern and a sign, beside world spawn on the capital's square; once per world
function placeClerk(server) {
  var level = server.overworld(), sp = level.getSharedSpawnPos(), d, a
  for (d = 3; d <= 8; d++) for (a = 0; a < 8; a++) {
    var x = sp.getX() + Math.round(d * Math.cos(a * 0.785398)), z = sp.getZ() + Math.round(d * Math.sin(a * 0.785398))
    var y = groundY(level, x, z, sp.getY() + 10, sp.getY() - 10)
    if (y === null) {
      var below = String(level.getBlock(x, sp.getY() - 1, z).id)
      if (!/^minecraft:(stone_bricks|cobblestone|smooth_stone|stone|dirt_path|polished_andesite|oak_planks|spruce_planks|gravel|stone_slab)$/.test(below)) continue
      y = sp.getY()
    }
    if (String(level.getBlock(x, y, z).id) !== 'minecraft:air' || String(level.getBlock(x + 1, y, z).id) !== 'minecraft:air') continue
    put(server, x + 1, y, z, 'minecraft:lectern[facing=north]')
    global.PEACOCK_NPC.spawn(server, OW, 'clerk', x + 0.5, y, z + 0.5, 0)
    console.info('[peacock] works: the Clerk is at ' + x + ',' + y + ',' + z)
    return true
  }
  return false
}

ServerEvents.loaded(event => {
  var server = event.server
  server.scheduleInTicks(300, () => {
    try {
      var data = server.persistentData
      if (!data.getBoolean(CLERK) && capitalStart(server.overworld())) { if (placeClerk(server)) data.putBoolean(CLERK, true) }
      var pending = String(works(server).getString('pending') || '')
      if (pending) build(server, pending)
    } catch (e) { console.warn('[peacock] works: ' + e) }
  })
})

// the Hall's plaques catch up whenever its chunk is loaded: every five minutes, and a minute after start
ServerEvents.tick(event => {
  var server = event.server
  if (server.tickCount % 6000 !== 1200) return
  try { hallRefresh(server) } catch (e) { console.warn('[peacock] works: hall plaques: ' + e) }
})

ServerEvents.commandRegistry(event => {
  var Commands = event.commands
  event.register(Commands.literal('peacock')
    .then(Commands.literal('projects')
      .executes(ctx => { var p = ctx.source.player; if (p) status(works(ctx.source.server), global.PEACOCK_NPC).forEach(t => p.tell(t)); return 1 })
      .then(Commands.literal('finish').requires(src => src.hasPermission(2)).executes(ctx => {
        var server = ctx.source.server, w = works(server), i = current(w)
        if (i < 0) { ctx.source.sendSystemMessage(Text.gray('All projects are finished.')); return 0 }
        PROJECTS[i].needs.forEach((n, k) => setGiven(w, PROJECTS[i].id, k, n[1]))
        save(server, w)
        finish(server, i)
        return 1
      }))
      .then(Commands.literal('clerk').requires(src => src.hasPermission(2)).executes(ctx => {
        var ok = placeClerk(ctx.source.server)
        if (ok) ctx.source.server.persistentData.putBoolean(CLERK, true)
        ctx.source.sendSystemMessage(Text.gray(ok ? 'The Clerk is on the square.' : 'No room for the Clerk near spawn.'))
        return ok ? 1 : 0
      }))))
})
})()
