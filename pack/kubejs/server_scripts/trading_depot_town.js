// Peacock — Trading Floor depots are town-bound.
//
// A trading depot (trading_floor:trading_depot) only goes down inside a settlement: a bell and at least
// BEDS_REQUIRED beds within RADIUS blocks horizontally. This is the "no trading halls" rule from
// docs/DECISIONS.md enforced in play rather than agreed. Counting uses block entities in the nearby
// loaded chunks (bells and beds both have one), so the check is cheap.
//
// Phase 4 adds the Blueprint requirement on the recipe; this stays as the placement rule.

// KubeJS loads every server script into one shared scope, so the body lives in its own block.
{
const SWITCHES = (() => { try { return JsonIO.read('kubejs/config/peacock.json') || {} } catch (e) { return {} } })()
const DEPOT_NEEDS_TOWN = SWITCHES.depotNeedsTown !== false

const DEPOT = 'trading_floor:trading_depot'
const RADIUS = 32
const BEDS_REQUIRED = 4

function countTown(level, center) {
  let bells = 0, bedHalves = 0
  const r2 = RADIUS * RADIUS
  const minCx = (center.x - RADIUS) >> 4, maxCx = (center.x + RADIUS) >> 4
  const minCz = (center.z - RADIUS) >> 4, maxCz = (center.z + RADIUS) >> 4
  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cz = minCz; cz <= maxCz; cz++) {
      if (!level.hasChunk(cx, cz)) continue
      level.getChunk(cx, cz).getBlockEntities().values().forEach(be => {
        const p = be.getBlockPos()
        const dx = p.x - center.x, dz = p.z - center.z
        if (dx * dx + dz * dz > r2) return
        const b = level.getBlock(p)
        if (b.id === 'minecraft:bell') bells++
        else if (b.hasTag('minecraft:beds')) bedHalves++
      })
    }
  }
  return { bells: bells, beds: Math.floor(bedHalves / 2) }
}

BlockEvents.placed(DEPOT, event => {
  if (!DEPOT_NEEDS_TOWN) return
  const player = event.player
  if (!player || player.isCreative()) return
  const town = countTown(event.level, event.block.pos)
  if (town.bells >= 1 && town.beds >= BEDS_REQUIRED) return
  event.cancel()
  player.tell(Text.red('A trading depot needs a town: a bell and at least ' + BEDS_REQUIRED + ' beds within ' + RADIUS + ' blocks. ')
    .append(Text.gray('Found ' + town.bells + ' bell(s) and ' + town.beds + ' bed(s).')))
})
}
// end-scope
