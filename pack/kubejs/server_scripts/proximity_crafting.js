// Peacock — Proximity Crafting: the storeroom table (2026-10-23).
//
// Aaron: "Okay add Proximity Crafting" (wanted: EMI showing what is craftable from the chests around you, as in
// Terraria). Its table reads every container within 8 blocks (defaultconfigs/proximitycrafting-server.toml), and EMI's
// "craftable" filter and fill button work from them.
//   • Recipe: a crafting table ringed by four chests and four ingots of any common metal (#peacock:common_metals, the
//     backpack's tag), instead of the mod's four diamonds. Its diamond trim is repainted as iron
//     (kubejs/assets/proximitycrafting/textures/block).
//   • Claims: the table does not ask whose chests it reads, so it would reach across a claim border into a neighbour's
//     storeroom. It can only be placed, and only be used, where every claimed chunk within its reach belongs to your
//     team or an ally (FTB Chunks); creative players are exempt.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants;
// event.cancel() last.
;(() => {
const TABLE = 'proximitycrafting:proximity_crafting_table'
const REACH = 8
let FTB = null, ChunkDimPos = null, BlockPos = null
try {
  FTB = Java.loadClass('dev.ftb.mods.ftbchunks.api.FTBChunksAPI')
  ChunkDimPos = Java.loadClass('dev.ftb.mods.ftblibrary.math.ChunkDimPos')
  BlockPos = Java.loadClass('net.minecraft.core.BlockPos')
} catch (e) { console.warn('[peacock] proximity table: FTB Chunks API not found, claims are not checked: ' + e) }

ServerEvents.recipes(event => {
  event.remove({ id: 'proximitycrafting:proximity_crafting_table' })
  event.shaped(TABLE, ['MCM', 'CTC', 'MCM'], {
    M: '#peacock:common_metals', C: 'minecraft:chest', T: 'minecraft:crafting_table',
  }).id('peacock:proximity_crafting_table')
})

// a claimed chunk within the table's reach that belongs to someone else, or null
function foreignClaim(level, player, x, z) {
  if (!FTB) return null
  try {
    var api = FTB.api()
    if (!api.isManagerLoaded()) return null
    var cx0 = (x - REACH) >> 4, cx1 = (x + REACH) >> 4, cz0 = (z - REACH) >> 4, cz1 = (z + REACH) >> 4, cx, cz
    for (cx = cx0; cx <= cx1; cx++) for (cz = cz0; cz <= cz1; cz++) {
      var c = api.getManager().getChunk(new ChunkDimPos(level, new BlockPos(cx * 16, 64, cz * 16)))
      if (!c) continue
      var t = c.getTeamData()
      if (t.isTeamMember(player.uuid) || t.isAlly(player.uuid)) continue
      return t
    }
  } catch (e) { console.warn('[peacock] proximity table: claim check: ' + e) }
  return null
}

function tellForeign(player, t) {
  var name = ''
  try { name = String(t.getTeam().getName().getString()) } catch (e) { name = '' }
  player.tell(Text.gray('This table would reach into land claimed by ' + (name || 'another team') + ' (' + REACH +
    ' blocks around it). Set it up further from their border, or ask them to make you an ally.'))
}

BlockEvents.placed(TABLE, event => {
  var player = event.player
  if (!player || player.isCreative()) return
  var t = foreignClaim(event.level, player, event.block.x, event.block.z)
  if (!t) return
  tellForeign(player, t)
  event.cancel()
})

BlockEvents.rightClicked(TABLE, event => {
  var player = event.player
  if (!player || player.isCreative()) return
  var t = foreignClaim(event.level, player, event.block.x, event.block.z)
  if (!t) return
  if (String(event.hand) === 'MAIN_HAND') tellForeign(player, t)   // both hands are refused, or the off hand opens it
  event.cancel()
})
})()
