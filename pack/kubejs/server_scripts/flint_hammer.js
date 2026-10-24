// Peacock — the Flint Prospector's Hammer: recipe and what it finds (2026-10-23). Item: startup_scripts/flint_hammer.js.
//
// Right-click a block with it in the main hand: every Geolosys ore within a 9 × 9 column centred on that block, from the
// block down 24 (64 since 2026-10-24, below), is named in one line ("Below here: hematite, malachite"), with no direction or depth; nothing found
// says so. One use per click, one click a second. The ore list is Geolosys' own (Prospecting.getDepositBlocks, minus
// its detection blacklist), so it always matches what generates. About 2,000 blocks read per click.
// Same day: the prospector's pick takes any common metal (#peacock:common_metals, the backpack's tag), not only iron.
// 2026-10-24, Aaron: "make the flint prospectors pic more useful". It now reads 64 blocks down (was 24) and says, per ore,
// roughly how deep the first of it is (to the nearest 8 blocks) and how much there is in the column (a trace: under 8
// blocks; some: under 40; rich: 40 or more): "Below here: hematite (rich, ~16 down), coal (a trace, ~48 down)".
// Deepslate and plain forms of one ore count together. Still no direction: that stays the metal pick's. About 5,300
// blocks read per click, one click a second.
// 2026-10-24, Aaron: "Have the flint pick also give directions, just it wont go as deep as the iron pic, it wont have
// nearly as many uses." The face you tap now matters, as with Geolosys' pick: it also looks 3 blocks into the block,
// away from you, in a 3 × 3 (the pick: 5 deep, 5 × 5, unlimited uses here), and names what is there and which way
// ("North, within 3 blocks: hematite"). Both lines every click. 32 uses (was 64).
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants,
// loop variables declared before their loops; event.cancel() last.
;(() => {
const HAMMER = 'peacock:flint_prospectors_hammer'
const HALF = 4          // 9 × 9
const DEPTH = 64
const REACH = 3        // the directional look: 3 deep, 3 × 3 (Geolosys' pick: proPickRange 5, proPickDiameter 5)
const WAY = { DOWN: 'Straight down', UP: 'Straight up', NORTH: 'North', SOUTH: 'South', WEST: 'West', EAST: 'East' }
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
  var pos = new MutableBlockPos(), found = {}, order = [], bottom = Math.max(level.getMinBuildHeight(), y - DEPTH), dx, dz, yy
  for (dx = -HALF; dx <= HALF; dx++) for (dz = -HALF; dz <= HALF; dz++) for (yy = y; yy >= bottom; yy--) {
    pos.set(x + dx, yy, z + dz)
    var state = level.getBlockState(pos)
    if (!deposits.contains(state) || !Prospecting.canDetect(state)) continue
    var key = String(state.getBlock().getDescriptionId())
    if (key.indexOf('sample') >= 0) continue                         // surface rocks are not what is below
    var group = key.replace('deepslate_', '')
    var f = found[group]
    if (!f) { f = found[group] = { key: key, count: 0, top: yy }; order.push(group) }
    if (key.indexOf('deepslate_') < 0) f.key = key                     // name it by its plain form when there is one
    f.count++
    if (yy > f.top) f.top = yy
  }
  // richest first
  order.sort((a, b) => found[b].count - found[a].count)
  return order.map(g => ({ key: found[g].key, count: found[g].count, depth: y - found[g].top }))
}

// what lies in the direction the tap points: from the tapped block REACH deep away from the face, 3 × 3 across
function oresThatWay(level, x, y, z, into) {
  var deposits = Prospecting.getDepositBlocks()
  if (deposits.isEmpty()) { Prospecting.populateDepositBlocks(); deposits = Prospecting.getDepositBlocks() }
  var sx = into.getStepX(), sy = into.getStepY(), sz = into.getStepZ()
  var pos = new MutableBlockPos(), seen = {}, keys = [], i, a, b
  for (i = 0; i < REACH; i++) for (a = -1; a <= 1; a++) for (b = -1; b <= 1; b++) {
    // a and b run along the two axes the direction does not
    var px = x + sx * i + (sx ? 0 : a), py = y + sy * i + (sy ? 0 : (sx ? a : b)), pz = z + sz * i + (sz ? 0 : b)
    pos.set(px, py, pz)
    var state = level.getBlockState(pos)
    if (!deposits.contains(state) || !Prospecting.canDetect(state)) continue
    var key = String(state.getBlock().getDescriptionId())
    if (key.indexOf('sample') >= 0) continue
    var group = key.replace('deepslate_', '')
    if (seen[group]) continue
    seen[group] = true
    keys.push(key)
  }
  return keys
}

function amount(n) { return n < 8 ? 'a trace' : n < 40 ? 'some' : 'rich' }
function roughly(d) { var r = Math.round(d / 8) * 8; return r < 4 ? 'right here' : '~' + r + ' down' }

BlockEvents.rightClicked(event => {
  var player = event.player, item = event.item
  if (!player || !item || String(item.id) !== HAMMER) return
  if (String(event.hand) !== 'MAIN_HAND' || !Prospecting) return
  var level = event.level, b = event.block
  try {
    if (player.getCooldowns().isOnCooldown(item.getItem())) return
    var into = event.facing.getOpposite(), way = WAY[String(into.name())] || String(into)
    var there = oresThatWay(level, b.x, b.y, b.z, into)
    if (there.length) {
      var dir = Text.gold(way + ', within ' + REACH + ' blocks: ')
      there.forEach((k, i) => { if (i) dir = dir.append(Text.white(', ')); dir = dir.append(Text.translate(k).white()) })
      player.tell(dir)
    } else {
      player.tell(Text.gray('Nothing ' + way.toLowerCase() + ' within ' + REACH + ' blocks.'))
    }
    var ores = oresBelow(level, b.x, b.y, b.z)
    if (ores.length) {
      var line = Text.gold('Below here: ')
      ores.forEach((o, i) => {
        if (i) line = line.append(Text.white(', '))
        line = line.append(Text.translate(o.key).white()).append(Text.gray(' (' + amount(o.count) + ', ' + roughly(o.depth) + ')'))
      })
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
