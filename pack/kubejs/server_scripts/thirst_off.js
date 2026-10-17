// Peacock — thirst is off (config/toughasnails/thirst.toml), so everything that only served thirst
// goes away: canteens, the water purifier and rain collector, dirty/purified water, juices (Tough As
// Nails and TAN+). Temperature items stay: wool/leaf armor, thermometer, temperature gauge,
// thermoregulator, TAN+ fans and air conditioners. Ice cream stays as plain food.
//
// Recipes are removed and the items tagged c:hidden_from_recipe_viewers so EMI does not list them.
// The Paxi override of TAN+'s broken purified-water recipe must stay (it prevents a crash while the
// datapack loads); this script removes that recipe again afterwards, which is fine.

// KubeJS loads every server script into one shared scope, so the body lives in its own block.
{
const THIRST_ITEMS = [
  // Tough As Nails
  'toughasnails:water_purifier', 'toughasnails:rain_collector',
  'toughasnails:dirty_water_bottle', 'toughasnails:purified_water_bottle',
  'toughasnails:apple_juice', 'toughasnails:cactus_juice', 'toughasnails:chorus_fruit_juice',
  'toughasnails:glow_berry_juice', 'toughasnails:melon_juice', 'toughasnails:pumpkin_juice',
  'toughasnails:sweet_berry_juice', 'toughasnails:charc_os',
  // TAN+
  'tan_plus:apple_juice_bucket', 'tan_plus:cactus_juice_bucket', 'tan_plus:chorus_juice_bucket',
  'tan_plus:glow_berry_juice_bucket', 'tan_plus:melon_juice_bucket', 'tan_plus:pumpkin_juice_bucket',
  'tan_plus:sweet_berry_juice_bucket', 'tan_plus:dirty_water_bucket', 'tan_plus:purified_water_bucket',
]
const CANTEEN_MATERIALS = ['leather', 'copper', 'iron', 'gold', 'diamond', 'netherite']
CANTEEN_MATERIALS.forEach(m => {
  THIRST_ITEMS.push(`toughasnails:empty_${m}_canteen`, `toughasnails:${m}_water_canteen`,
    `toughasnails:${m}_dirty_water_canteen`, `toughasnails:${m}_purified_water_canteen`)
})
const THIRST_FLUIDS = ['tan_plus:apple_juice', 'tan_plus:cactus_juice', 'tan_plus:chorus_juice',
  'tan_plus:glow_berry_juice', 'tan_plus:melon_juice', 'tan_plus:pumpkin_juice', 'tan_plus:sweet_berry_juice',
  'tan_plus:dirty_water', 'tan_plus:purified_water']

ServerEvents.recipes(event => {
  THIRST_ITEMS.forEach(id => {
    if (!Item.exists(id)) return
    event.remove({ output: id })
    event.remove({ input: id })
  })
  event.remove({ type: 'toughasnails:water_purifying' })
  // TAN+ Create integration for its drinks (filling/emptying/mixing of juice and water fluids)
  event.remove({ id: /^tan_plus:(filling|emptying|mixing)\// })
  event.remove({ id: /^tan_plus:.*_juice_bucket_craft$/ })
})

ServerEvents.tags('item', event => {
  THIRST_ITEMS.forEach(id => { if (Item.exists(id)) event.add('c:hidden_from_recipe_viewers', id) })
})

ServerEvents.tags('fluid', event => {
  THIRST_FLUIDS.forEach(id => event.add('c:hidden_from_recipe_viewers', id))
})
}
// end-scope
