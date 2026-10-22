// Peacock — more for villagers to sell, modded goods included, and a floor under the cure discount (2026-10-22).
//
// Aaron: "Add more things to trade for including modded items." Villagers mostly sold vanilla goods a Create line
// makes for free by week two, so emeralds piled up with nowhere to go. Each profession now also sells a few things a
// settler wants: Farmer's Delight crops and pies, Aquaculture tackle, Cold Sweat furs and waterskins, Create Deco and
// Macaw's building blocks, Ironworks bronze tools and armour, Spartan alloy weapons and shields, rumour maps, Nature's
// Compass and more. Same mechanism as metals.js: an offer is added to the villager's own list when a player right-clicks
// it (before the trade screen opens), once it has the profession and level, so existing villagers get them too.
//   • Nothing a Blueprint locks is ever sold (checked against blueprints.js' gated list at runtime), so trades cannot
//     skip the ladder; an item missing from the pack is skipped with one warning.
//   • Winter food: the farmer's pies and preserved meats cost half again as much in winter (Serene Seasons), when
//     nothing grows outside.
//   • Cure discount floor: curing a zombie villager gives a "major positive" reputation worth about 100 points, enough
//     to drop most trades to a single emerald. On every right-click the player's major-positive gossip with that villager
//     is capped at 5 (25 points): a cured villager is still cheaper, never nearly free.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants; never
// touch a Java Map (see metals.js).
;(() => {
// [profession, level, emeralds, item, count, nbt?]   (the villager sells `count` of `item` for `emeralds`)
const SELLS = [
  // farmer: seeds year round, food that keeps
  ['farmer', 1, 1, 'farmersdelight:cabbage_seeds', 6], ['farmer', 1, 1, 'farmersdelight:tomato_seeds', 6],
  ['farmer', 1, 1, 'farmersdelight:rice', 6], ['farmer', 1, 1, 'farmersdelight:onion', 6],
  ['farmer', 2, 2, 'farmersdelight:rich_soil', 4], ['farmer', 2, 3, 'farmersdelight:iron_knife', 1],
  ['farmer', 3, 2, 'farmersdelight:apple_pie', 1], ['farmer', 3, 3, 'farmersdelight:shepherds_pie', 1],
  ['farmer', 4, 2, 'farmersdelight:ham', 2], ['farmer', 4, 1, 'farmersdelight:bacon', 3],
  // fisherman: Aquaculture tackle
  ['fisherman', 1, 1, 'aquaculture:worm', 8], ['fisherman', 2, 2, 'aquaculture:fishing_line', 1],
  ['fisherman', 2, 2, 'aquaculture:bobber', 1], ['fisherman', 2, 3, 'aquaculture:iron_hook', 1],
  ['fisherman', 3, 6, 'aquaculture:iron_fishing_rod', 1], ['fisherman', 3, 4, 'aquaculture:iron_fillet_knife', 1],
  ['fisherman', 4, 8, 'aquaculture:tackle_box', 1], ['fisherman', 4, 1, 'aquaculture:fish_fillet_cooked', 4],
  // butcher
  ['butcher', 1, 1, 'farmersdelight:minced_beef', 4], ['butcher', 2, 1, 'farmersdelight:bacon', 4],
  ['butcher', 3, 3, 'animania:salt_lick', 1], ['butcher', 3, 1, 'animania:salt', 6],
  // shepherd and leatherworker: Cold Sweat's warm things
  ['shepherd', 1, 1, 'farmersdelight:canvas', 3], ['shepherd', 2, 2, 'cold_sweat:goat_fur', 1],
  ['shepherd', 3, 6, 'cold_sweat:sewing_table', 1],
  ['leatherworker', 1, 2, 'cold_sweat:waterskin', 1], ['leatherworker', 2, 3, 'supplementaries:sack', 1],
  ['leatherworker', 2, 4, 'cold_sweat:hoglin_hide', 1], ['leatherworker', 3, 6, 'cold_sweat:chameleon_molt', 1],
  ['leatherworker', 4, 12, 'supplementaries:quiver', 1],
  // mason: Create Deco and Macaw's
  ['mason', 1, 1, 'createdeco:dean_bricks', 8], ['mason', 1, 1, 'createdeco:pearl_bricks', 8],
  ['mason', 1, 1, 'createdeco:scarlet_bricks', 8], ['mason', 2, 1, 'createdeco:umber_bricks', 8],
  ['mason', 2, 1, 'createdeco:verdant_bricks', 8], ['mason', 2, 1, 'mcwroofs:stone_roof', 4],
  ['mason', 3, 1, 'mcwroofs:red_terracotta_roof', 4], ['mason', 3, 1, 'createdeco:andesite_catwalk', 4],
  ['mason', 3, 1, 'createdeco:andesite_bars', 8], ['mason', 4, 2, 'createdeco:copper_window', 4],
  ['mason', 4, 2, 'createdeco:yellow_andesite_lamp', 2],
  // toolsmith: bronze and the tools of the trade
  ['toolsmith', 2, 6, 'create_ironworks:bronze_shovel', 1], ['toolsmith', 2, 8, 'create_ironworks:bronze_axe', 1],
  ['toolsmith', 3, 8, 'create_ironworks:bronze_pickaxe', 1], ['toolsmith', 3, 6, 'geolosys:prospectors_pick', 1],
  ['toolsmith', 4, 4, 'create:wrench', 1], ['toolsmith', 4, 6, 'create:goggles', 1],
  // weaponsmith: Spartan alloy weapons
  ['weaponsmith', 2, 9, 'spartanweaponry:bronze_longsword', 1], ['weaponsmith', 3, 12, 'spartanweaponry:bronze_halberd', 1],
  ['weaponsmith', 3, 12, 'spartanweaponry:constantan_spear', 1], ['weaponsmith', 4, 14, 'spartanweaponry:electrum_rapier', 1],
  ['weaponsmith', 5, 16, 'spartanweaponry:invar_battle_hammer', 1],
  // armorer: bronze armour and Spartan shields
  ['armorer', 2, 6, 'create_ironworks:bronze_armor_helmet', 1], ['armorer', 2, 6, 'create_ironworks:bronze_armor_boots', 1],
  ['armorer', 3, 10, 'create_ironworks:bronze_armor_leggings', 1], ['armorer', 3, 12, 'create_ironworks:bronze_armor_chestplate', 1],
  ['armorer', 3, 8, 'spartanshields:bronze_basic_shield', 1], ['armorer', 5, 16, 'spartanshields:invar_tower_shield', 1],
  // cleric: what curing takes
  ['cleric', 3, 4, 'minecraft:splash_potion', 1, '{Potion:"minecraft:weakness"}'], ['cleric', 4, 10, 'minecraft:golden_apple', 1],
  // librarian
  ['librarian', 2, 3, 'supplementaries:antique_ink', 1], ['librarian', 3, 8, 'supplementaries:globe', 1],
  ['librarian', 3, 10, 'map_atlases:atlas', 1],
  // cartographer: rumours for sale, and the instruments of a surveyor
  ['cartographer', 2, 3, 'supplementaries:wind_vane', 1], ['cartographer', 2, 4, 'supplementaries:altimeter', 1],
  ['cartographer', 2, 8, 'peacock:rumour_voucher', 1, '{rumour:"survivors_tower"}'],
  ['cartographer', 3, 12, 'peacock:rumour_voucher', 1, '{rumour:"wrought_chamber"}'],
  ['cartographer', 3, 12, 'peacock:rumour_voucher', 1, '{rumour:"umvuthana_grove"}'],
  ['cartographer', 3, 16, 'naturescompass:naturescompass', 1],
  ['cartographer', 4, 14, 'peacock:rumour_voucher', 1, '{rumour:"frostmaw"}'],
  ['cartographer', 4, 16, 'peacock:rumour_voucher', 1, '{rumour:"illager_fort"}'],
  ['cartographer', 5, 24, 'peacock:rumour_voucher', 1, '{rumour:"cursed_pyramid"}'],
]
const WINTER_FOOD = { 'farmersdelight:apple_pie': true, 'farmersdelight:shepherds_pie': true, 'farmersdelight:ham': true, 'farmersdelight:bacon': true }
const MAX_USES = 12

const MerchantOffer = Java.loadClass('net.minecraft.world.item.trading.MerchantOffer')
let GossipType = null
try { GossipType = Java.loadClass('net.minecraft.world.entity.ai.gossip.GossipType') } catch (e) { console.warn('[peacock] trades: no GossipType, cure floor off: ' + e) }

var warned = {}
function stack(id, count, nbt) {
  try {
    var s = nbt ? Item.of(id, count, nbt) : Item.of(id, count)
    if (s && !s.isEmpty()) return s
  } catch (e) { }
  if (!warned[id]) { warned[id] = true; console.warn('[peacock] trades: ' + id + ' is not in the pack, offer skipped') }
  return null
}

function gated(id) {
  try { return !!(global.PEACOCK_GATED_ITEMS && global.PEACOCK_GATED_ITEMS[id]) } catch (e) { return false }
}

function season(server) {
  try { return String(Java.loadClass('sereneseasons.api.season.SeasonHelper').getSeasonState(server.overworld()).getSeason()) }
  catch (e) { return '' }
}

function profOf(v) {
  var prof = String(v.getVillagerData().getProfession().name())
  return prof.indexOf(':') >= 0 ? prof.substring(prof.indexOf(':') + 1) : prof
}

function capCure(v, player) {
  if (!GossipType) return
  var gossips = v.getGossips(), uuid = player.getUUID()
  var all = t => true
  var before = gossips.getReputation(uuid, all)
  gossips.remove(uuid, GossipType.MAJOR_POSITIVE)
  var lost = before - gossips.getReputation(uuid, all)
  // major positive weighs 5 per point; keep at most 5 points of it
  if (lost > 0) gossips.add(uuid, GossipType.MAJOR_POSITIVE, Math.min(5, Math.floor(lost / 5)))
}

ItemEvents.entityInteracted(event => {
  var v = event.target
  if (!v || String(v.type) !== 'minecraft:villager' || v.level.isClientSide()) return
  if (v.tags && v.tags.contains('peacock_npc')) return          // the capital's service people keep their own stock
  try {
    capCure(v, event.player)
    var prof = profOf(v), level = v.getVillagerData().getLevel()
    var offers = null, winter = null
    SELLS.forEach(s => {
      if (s[0] !== prof || level < s[1] || gated(s[3])) return
      if (!offers) offers = v.getOffers()
      for (var i = 0; i < offers.size(); i++) {
        var o = offers.get(i)
        if (String(o.getResult().id) !== s[3] || String(o.getBaseCostA().id) !== 'minecraft:emerald') continue
        if (s[5] && String(o.getResult().nbt) !== String(stack(s[3], s[4], s[5]).nbt)) continue
        if (WINTER_FOOD[s[3]]) {
          if (winter === null) winter = season(v.level.server) === 'WINTER'
          o.setSpecialPriceDiff(winter ? Math.ceil(s[2] / 2) : 0)
        }
        return
      }
      var result = stack(s[3], s[4], s[5]), cost = stack('minecraft:emerald', s[2])
      if (!result || !cost) return
      offers.add(new MerchantOffer(cost, result, MAX_USES, 5 * s[1], 0.05))
    })
  } catch (e) { console.warn('[peacock] trades: ' + e) }
})
})()
