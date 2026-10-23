// Peacock — the Flint Prospector's Hammer: recipe and what it finds (2026-10-23). Item: startup_scripts/flint_hammer.js.
//
// Right-click a block with it in the main hand: every Geolosys ore within a 9 × 9 column centred on that block, from the
// block down 24, is named in one line ("Below here: hematite, malachite"), with no direction or depth; nothing found
// says so. One use per click, one click a second. The ore list is Geolosys' own (Prospecting.getDepositBlocks, minus
// its detection blacklist), so it always matches what generates. About 2,000 blocks read per click.
// Same day: the prospector's pick takes any common metal (#peacock:common_metals, the backpack's tag), not only iron.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants,
// loop variables declared before their loops; event.cancel() last.
;(() => {
const HAMMER = 'peacock:flint_prospectors_hammer'
const HALF = 4          // 9 × 9
const DEPTH = 24
let Prospecting = null, MutableBlockPos = null
try {
  Prospecting = Java.loadClass('com.oitsjustjose.geolosys.common.utils.Prospecting')
  MutableBlockPos = Java.loadClass('net.minecraft.core.BlockPos$MutableBlockPos')
} catch (e) { console.warn('[peacock] flint hammer: Geolosys not found: ' + e) }

ServerEvents.recipes(event => {
  event.shaped(HAMMER, ['FCF', ' S ', ' S '], { F: 'minecraft:flint', C: '#forge:cobblestone', S: 'minecraft:stick' })
    .id('peacock:flint_prospectors_hammer')
  event.remove({ id: 'geolosys:crafting/prospectors_pick_from_crafting' })
  event.shaped('geolosys:prospectors_pick', ['III', ' S ', ' S '], { I: '#peacock:common_metals', S: '#forge:rods/wooden' })
    .id('peacock:prospectors_pick')
})

function oresBelow(level, x, y, z) {
  var deposits = Prospecting.getDepositBlocks()
  if (deposits.isEmpty()) { Prospecting.populateDepositBlocks(); deposits = Prospecting.getDepositBlocks() }
  var pos = new MutableBlockPos(), seen = {}, names = [], bottom = Math.max(level.getMinBuildHeight(), y - DEPTH), dx, dz, yy
  for (dx = -HALF; dx <= HALF; dx++) for (dz = -HALF; dz <= HALF; dz++) for (yy = y; yy >= bottom; yy--) {
    pos.set(x + dx, yy, z + dz)
    var state = level.getBlockState(pos)
    if (!deposits.contains(state) || !Prospecting.canDetect(state)) continue
    var block = state.getBlock(), key = String(block.getDescriptionId())
    if (seen[key] || key.indexOf('sample') >= 0) continue          // surface rocks are not what is below
    seen[key] = true
    names.push(key)
  }
  return names
}

BlockEvents.rightClicked(event => {
  var player = event.player, item = event.item
  if (!player || !item || String(item.id) !== HAMMER) return
  if (String(event.hand) !== 'MAIN_HAND' || !Prospecting) return
  var level = event.level, b = event.block
  try {
    if (player.getCooldowns().isOnCooldown(item.getItem())) return
    var names = oresBelow(level, b.x, b.y, b.z)
    if (names.length) {
      var line = Text.gold('Below here: ')
      names.forEach((k, i) => { if (i) line = line.append(Text.white(', ')); line = line.append(Text.translate(k).white()) })
      player.tell(line)
    } else {
      player.tell(Text.gray('Nothing below here, ' + DEPTH + ' blocks down.'))
    }
    level.getServer().runCommandSilent('playsound minecraft:block.stone.hit player @a ' + b.x + ' ' + b.y + ' ' + b.z + ' 0.6 1.4')
    player.getCooldowns().addCooldown(item.getItem(), 20)
    if (!player.isCreative()) item.hurtAndBreak(1, player, p => p.broadcastBreakEvent(event.hand))
  } catch (e) { console.warn('[peacock] flint hammer: ' + e) }
  event.cancel()
})
})()
