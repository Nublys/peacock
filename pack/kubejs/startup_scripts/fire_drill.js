// Peacock — the fire drill.
//
// Fire from sticks (Aaron, 2026-10-18): flint and steel needs iron, and with Cold Sweat a first winter night needs a
// campfire. Crafted from three sticks (server_scripts/fire_drill_recipe.js). Hold right-click on a block for two
// seconds: an unlit campfire or candle lights; anything else gets a fire on the face you aimed at.
// Twelve uses.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants.
;(() => {
const USE_TICKS = 40
const REACH = 5

// campfires and candles only: furnaces, lamps and ores also have a "lit" property, and lighting those would be wrong
function lightable(id, props) {
  if (!/campfire|candle/.test(id)) return false
  if (!props || !props.containsKey('lit') || String(props.get('lit')) !== 'false') return false
  return !(props.containsKey('waterlogged') && String(props.get('waterlogged')) === 'true')
}

function ignite(stack, level, entity) {
  if (level.isClientSide()) return stack
  try {
    var hit = entity.rayTrace(REACH)
    var blk = hit ? hit.block : null
    if (!blk) return stack
    var props = blk.getProperties()
    var x = blk.getPos().getX(), y = blk.getPos().getY(), z = blk.getPos().getZ()
    if (lightable(String(blk.getId()), props)) {
      var next = {}
      var it = props.keySet().iterator()
      while (it.hasNext()) { var k = String(it.next()); next[k] = String(props.get(k)) }
      next['lit'] = 'true'
      blk.set(blk.getId(), next)
    } else {
      var face = hit.facing
      if (!face) return stack
      var target = blk.offset(face)
      if (String(target.getId()) !== 'minecraft:air') return stack
      target.set('minecraft:fire')
      x = target.getPos().getX(); y = target.getPos().getY(); z = target.getPos().getZ()
    }
    level.getServer().runCommandSilent('playsound minecraft:item.flintandsteel.use block @a ' + x + ' ' + y + ' ' + z + ' 1 0.8')
    stack.hurtAndBreak(1, entity, e => {})
  } catch (e) { console.warn('[peacock] fire drill: ' + e) }
  return stack
}

StartupEvents.registry('item', event => {
  event.create('peacock:fire_drill')
    .displayName('Fire Drill')
    .texture('peacock:item/fire_drill')
    .maxDamage(12)
    .useAnimation('bow')
    .useDuration(stack => USE_TICKS)
    .use((level, player, hand) => true)
    .finishUsing((stack, level, entity) => ignite(stack, level, entity))
    .tooltip(Text.gray('Hold right-click on a block to light it'))
})
})()
