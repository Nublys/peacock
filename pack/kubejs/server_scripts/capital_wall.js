// Peacock — the capital's wall.
//
// CTOV's "fortified" variants are a stone keep in the middle of town, not a wall around it (2026-10-18:
// "no walls around the capital", twice). No village mod on Forge 1.20.1 builds a perimeter, so the pack does:
// once, after the world's first start, this finds the capital's structure bounding box at world spawn and
// raises a stone-brick wall six blocks outside it — three high with a crenellated top, a lantern pillar
// every eight blocks, towers on the corners, and a gate in the middle of each side. It follows the terrain
// column by column and fills its own foundation down to solid ground. A bounty board stands just inside
// each gate — those four are the capital's boards (a pool-injected board piece won every contested house
// slot and gave the town twenty of them, 2026-10-18).
//
// It runs 10 s after the server loads if it has not run before (server persistentData), and can be rerun
// by an operator with `/peacock wall` (rebuilds in place; harmless). `capitalWall: false` in
// kubejs/config/peacock.json disables it.
//
// KubeJS loads every server script into one shared scope; a bare `{}` block does not isolate `const` in
// its Rhino ("redeclaration of var"), so the body lives in a function scope.
;(() => {
const SWITCHES = (() => { try { return JsonIO.read('kubejs/config/peacock.json') || {} } catch (e) { return {} } })()
const ON = SWITCHES.capitalWall !== false
// the capital is Terralith's fortified village since 2026-10-18: a castle town, but — like CTOV's "fortified"
// variants — without a perimeter wall. This script is the wall.
const CAPITALS = [['terralith', 'fortified_village'], ['peacock', 'capital/plains'], ['peacock', 'capital/taiga']]
const MARGIN = 6          // blocks outside the structure's bounding box
const HEIGHT = 3          // wall body; crenellations on top
const PILLAR_EVERY = 8
const GATE_HALF = 1       // gate is 2*GATE_HALF+1 wide

function findCapital(level) {
  const Registries = Java.loadClass('net.minecraft.core.registries.Registries')
  const ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
  const reg = level.registryAccess().registryOrThrow(Registries.STRUCTURE)
  const sm = level.structureManager()
  const spawn = level.getSharedSpawnPos()
  for (let i = 0; i < CAPITALS.length; i++) {
    const structure = reg.get(new ResourceLocation(CAPITALS[i][0], CAPITALS[i][1]))
    if (!structure) continue
    const start = sm.getStructureAt(spawn, structure)
    if (start && start.isValid()) return { variant: CAPITALS[i].join(':'), bb: start.getBoundingBox(), spawn: spawn }
  }
  return null
}

const SOFT = id => id === 'minecraft:air' || id === 'minecraft:cave_air' || id.endsWith('_leaves') || id.endsWith('_log')
  || id.endsWith('grass') || id.endsWith('fern') || id.endsWith('_bush') || id.endsWith('flower') || id === 'minecraft:snow'
  || id.includes('water') || id.endsWith('_sapling') || id.endsWith('_carpet') || id === 'minecraft:vine' || id.endsWith('mushroom')

function groundY(level, Heightmap, x, z) {
  // first air block above anything that blocks motion (leaves ignored), i.e. one above the ground block
  return level.getHeight(Heightmap.MOTION_BLOCKING_NO_LEAVES, x, z)
}

function brick(rng) {
  const r = rng()
  return r < 0.12 ? 'minecraft:mossy_stone_bricks' : r < 0.2 ? 'minecraft:cracked_stone_bricks' : 'minecraft:stone_bricks'
}

function build(level, bb, log) {
  const Heightmap = Java.loadClass('net.minecraft.world.level.levelgen.Heightmap$Types')
  const x0 = bb.minX() - MARGIN, x1 = bb.maxX() + MARGIN, z0 = bb.minZ() - MARGIN, z1 = bb.maxZ() + MARGIN
  let seed = (x0 * 31 + z0) >>> 0
  const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const cols = []
  // KubeJS' Rhino rejects a second `let x` in another block of the same function ("redeclaration of var x"),
  // so every loop variable in this function has its own name
  for (let ax = x0; ax <= x1; ax++) cols.push([ax, z0, 'n'])
  for (let az = z0 + 1; az <= z1; az++) cols.push([x1, az, 'e'])
  for (let bx = x1 - 1; bx >= x0; bx--) cols.push([bx, z1, 's'])
  for (let bz = z1 - 1; bz > z0; bz--) cols.push([x0, bz, 'w'])
  const midX = Math.floor((x0 + x1) / 2), midZ = Math.floor((z0 + z1) / 2)
  const isGate = (x, z, side) => (side === 'n' || side === 's') ? Math.abs(x - midX) <= GATE_HALF : Math.abs(z - midZ) <= GATE_HALF
  const isGatePost = (x, z, side) => (side === 'n' || side === 's') ? Math.abs(x - midX) === GATE_HALF + 1 : Math.abs(z - midZ) === GATE_HALF + 1
  const isCorner = (x, z) => (x === x0 || x === x1) && (z === z0 || z === z1)
  let placed = 0
  const set = (x, y, z, id, props) => { const b = level.getBlock(x, y, z); props ? b.set(id, props) : b.set(id); placed++ }

  for (let i = 0; i < cols.length; i++) {
    const x = cols[i][0], z = cols[i][1], side = cols[i][2]
    const yg = groundY(level, Heightmap, x, z)
    // foundation: stone down through soft blocks and water to something solid (at most 8)
    for (let fy = yg - 1; fy > yg - 9; fy--) {
      const fid = level.getBlock(x, fy, z).id
      if (!SOFT(fid) && fy < yg - 1) break
      set(x, fy, z, 'minecraft:stone_bricks')
    }
    if (isGate(x, z, side)) {
      for (let gy = yg; gy < yg + HEIGHT; gy++) { if (level.getBlock(x, gy, z).id !== 'minecraft:air') set(x, gy, z, 'minecraft:air') }
      set(x, yg - 1, z, 'minecraft:dirt_path')
      set(x, yg + HEIGHT, z, 'minecraft:stone_bricks')                                   // the arch
      if (Math.abs((side === 'n' || side === 's') ? x - midX : z - midZ) === 0) {
        set(x, yg + HEIGHT - 1, z, 'minecraft:lantern', { hanging: 'true' })
        // the notice board just inside each gate: the capital's bounty boards live here (four, one per gate)
        const ix = side === 'e' ? x - 3 : side === 'w' ? x + 3 : x + 2
        const iz = side === 'n' ? z + 3 : side === 's' ? z - 3 : z + 2
        const by = groundY(level, Heightmap, ix, iz)
        set(ix, by - 1, iz, 'minecraft:dirt_path')
        set(ix, by, iz, 'bountiful:bountyboard')
        set(ix + (side === 'n' || side === 's' ? 1 : 0), by, iz + (side === 'e' || side === 'w' ? 1 : 0), 'minecraft:lantern', { hanging: 'false' })
      }
      continue
    }
    const corner = isCorner(x, z), pillar = corner || isGatePost(x, z, side) || i % PILLAR_EVERY === 0
    const top = yg + HEIGHT + (corner ? 2 : pillar ? 1 : 0)
    for (let wy = yg; wy < top; wy++) set(x, wy, z, brick(rng))
    if (pillar) set(x, top, z, 'minecraft:lantern', { hanging: 'false' })
    else set(x, top, z, 'minecraft:stone_brick_wall')
  }
  log('wall: ' + cols.length + ' columns, ' + placed + ' blocks, from ' + x0 + ',' + z0 + ' to ' + x1 + ',' + z1)
  return placed
}

function run(server, log) {
  const level = server.overworld()
  const cap = findCapital(level)
  if (!cap) { log('wall: no capital structure at world spawn ' + level.getSharedSpawnPos() + ' — nothing built'); return false }
  log('wall: capital (' + cap.variant + ') bounds ' + cap.bb.minX() + ',' + cap.bb.minZ() + ' to ' + cap.bb.maxX() + ',' + cap.bb.maxZ())
  build(level, cap.bb, log)
  server.persistentData.putBoolean('peacock_capital_wall', true)
  return true
}

ServerEvents.loaded(event => {
  if (!ON) return
  const server = event.server
  if (server.persistentData.getBoolean('peacock_capital_wall')) return
  server.scheduleInTicks(200, () => {
    try { run(server, m => console.info('[peacock] ' + m)) }
    catch (e) { console.error('[peacock] wall: failed — ' + e + '. Rerun with /peacock wall once the capital is loaded.') }
  })
})

ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event
  event.register(Commands.literal('peacock')
    .then(Commands.literal('wall')
      .requires(src => src.hasPermission(2))
      .executes(ctx => {
        const src = ctx.source
        try {
          const ok = run(src.server, m => { console.info('[peacock] ' + m); src.sendSystemMessage(Text.gray(m)) })
          return ok ? 1 : 0
        } catch (e) {
          src.sendSystemMessage(Text.red('wall failed: ' + e))
          console.error('[peacock] wall: ' + e)
          return 0
        }
      })))
})
})()
