// priority: 10
// Peacock — every Geolosys metal has work to do (2026-10-21). Items, blocks and villager trades:
// startup_scripts/metals.js. This script runs before blueprints.js (priority 10), so the Blueprint staging pass
// sees the recipes as they end up here.
//
// 1. One tin, one bronze, one steel. Create: Ironworks (added the same day) makes tin, bronze and steel tools,
//    armour, hammers and paxels from its own items, by item id. Its items are the pack's: Geolosys' tin ingot and
//    nugget, and Big Cannons' bronze and steel ingots, scrap and blocks, are turned into Ironworks' wherever a
//    recipe makes them, their duplicate block/nugget crafts go, and they leave the forge tags and EMI. Big Cannons
//    melts metal by tag (forge:ingots/bronze, forge:ingots/steel), so its cannons cast from Ironworks' metal.
//    Bronze: Ironworks mixes copper + tin unheated (1 ingot, early), Big Cannons heated (2 ingots).
//    Ironworks' own brass mixes (one ingot where Create gives two) are removed, and Create's own brass recipe is
//    restored in the pack datapack (Ironworks overwrote it). Its duplicate "compat" tool recipes go.
// 2. Crushed Geolosys ore was a dead end: Create crushes lead, silver, nickel, aluminium and platinum clusters
//    (they carry forge:raw_materials tags) into crushed ore whose washing and smelting recipes only exist for
//    mods we do not have. Washing now gives 9 nuggets plus the ore's real companion metal (galena carries silver,
//    nickel ores carry platinum), and crushed ore smelts to an ingot.
// 3. Lead is shot: musket cartridges and Big Cannons' shot balls and solid shot also take lead (more cartridges and
//    shot balls per craft than iron). Wrapped in the same Recipe Stages gate as the originals (Blasting, Cannons).
// 4. Alloys in a heated basin: electrum (gold + silver), constantan (copper + nickel), invar (2 iron + nickel).
// 5. Storage blocks, and sheets where something uses them: platinum sheets make a precision mechanism in 3 steps
//    instead of 5 and without Create's scrap chance. (Aluminium sheets made Eureka balloons until Eureka went with
//    Valkyrien Skies, 2026-10-24; the sheet is still pressed, for whatever replaces it.)
// 6. Villagers buy the rarer metals (BUYS, at the end).
;(() => {
const SW = (() => { try { return JsonIO.read('kubejs/config/peacock.json') || {} } catch (e) { return {} } })()
const LADDER_ON = SW.ladder !== false

// a crafting recipe a Blueprint rung gates, built the way blueprints.js wraps the originals
function gated(rung, json) {
  if (!LADDER_ON) return json
  return { type: json.type === 'minecraft:crafting_shaped' ? 'recipestages:shaped_stage' : 'recipestages:stage', stage: 'peacock_' + rung, recipe: json }
}

const FOLD = [   // [duplicate, the pack's item]
  ['geolosys:tin_ingot', 'create_ironworks:tin_ingot'], ['geolosys:tin_nugget', 'create_ironworks:tin_nugget'],
  ['createbigcannons:bronze_ingot', 'create_ironworks:bronze_ingot'], ['createbigcannons:bronze_scrap', 'create_ironworks:bronze_nugget'],
  ['createbigcannons:bronze_block', 'create_ironworks:bronze_block'],
  ['createbigcannons:steel_ingot', 'create_ironworks:steel_ingot'], ['createbigcannons:steel_scrap', 'create_ironworks:steel_nugget'],
  ['createbigcannons:steel_block', 'create_ironworks:steel_block'],
]
const FOLD_TAGS = {
  'geolosys:tin_ingot': 'forge:ingots/tin', 'geolosys:tin_nugget': 'forge:nuggets/tin',
  'createbigcannons:bronze_ingot': 'forge:ingots/bronze', 'createbigcannons:bronze_scrap': 'forge:nuggets/bronze',
  'createbigcannons:bronze_block': 'forge:storage_blocks/bronze',
  'createbigcannons:steel_ingot': 'forge:ingots/steel', 'createbigcannons:steel_scrap': 'forge:nuggets/steel',
  'createbigcannons:steel_block': 'forge:storage_blocks/steel',
}
// Ironworks' tin ore is switched off (Geolosys is the only ore), so its ore and raw tin never appear
const HIDE = FOLD.map(f => f[0]).concat(['create_ironworks:tin_ore', 'create_ironworks:deepslate_tin_ore',
  'create_ironworks:raw_tin', 'create_ironworks:raw_tin_block'])

// Geolosys metals that Create crushes: [metal, companion nugget, its chance]
const CRUSHED = [
  ['lead', 'geolosys:silver_nugget', 0.5], ['silver', 'geolosys:lead_nugget', 0.5],
  ['nickel', 'geolosys:platinum_nugget', 0.25], ['platinum', 'geolosys:nickel_nugget', 0.25],
  ['aluminum', null, 0],
]
// storage blocks: [block, ingot]
const BLOCKS = [
  ['lead', 'geolosys:lead_ingot'], ['silver', 'geolosys:silver_ingot'], ['nickel', 'geolosys:nickel_ingot'],
  ['aluminum', 'geolosys:aluminum_ingot'], ['platinum', 'geolosys:platinum_ingot'],
  ['electrum', 'peacock:electrum_ingot'], ['constantan', 'peacock:constantan_ingot'], ['invar', 'peacock:invar_ingot'],
]

ServerEvents.recipes(event => {
  // ------------------------------------------------------------ 1. one tin, one bronze, one steel
  ;['bronze_block', 'bronze_ingot_from_block', 'bronze_ingot_from_nuggets', 'bronze_scrap',
    'steel_block', 'steel_ingot_from_block', 'steel_ingot_from_nuggets', 'steel_scrap'].forEach(id => event.remove({ id: 'createbigcannons:' + id }))
  event.remove({ id: 'geolosys:crafting/nuggets/tin_ingot_to_tin_nugget' })
  event.remove({ id: 'geolosys:crafting/nuggets/tin_nugget_to_tin_ingot' })
  FOLD.forEach(f => {
    event.replaceOutput({}, f[0], f[1])
    event.replaceInput({}, f[0], f[1])
  })
  // replaceOutput only reaches recipe types KubeJS has a schema for (here: Geolosys' smelting and blasting). Big
  // Cannons' Create mixing and compacting recipes are rebuilt with the ids swapped in their JSON (first boot,
  // 2026-10-21: "modified 2 recipes", and the basin still made Big Cannons' hidden bronze and steel).
  ;['mixing/alloy_bronze_tin', 'mixing/alloy_bronze_brass', 'mixing/alloy_bronze_tinless', 'mixing/alloy_steel',
    'compacting/forge_bronze_ingot', 'compacting/forge_bronze_block', 'compacting/forge_bronze_nugget',
    'compacting/forge_steel_ingot', 'compacting/forge_steel_block', 'compacting/forge_steel_nugget'].forEach(path => {
    var id = 'createbigcannons:' + path
    event.forEachRecipe({ id: id }, r => {
      var text = String(r.json)
      FOLD.forEach(f => { text = text.split('"' + f[0] + '"').join('"' + f[1] + '"') })
      var json = JSON.parse(text)
      delete json.conditions
      event.remove({ id: id })
      event.custom(json).id('peacock:metals/fold/' + path.replace('/', '_'))
    })
  })
  event.remove({ id: /^create_ironworks:materials\/alloys\/.*mixing_brass$/ })
  event.remove({ id: /^create_ironworks:compat\/(bronze|steel)_/ })

  // ------------------------------------------------------------ 2. crushed Geolosys ore
  CRUSHED.forEach(c => {
    var crushed = 'create:crushed_raw_' + c[0]
    var results = [{ item: 'geolosys:' + c[0] + '_nugget', count: 9 }]
    if (c[1]) results.push({ item: c[1], chance: c[2] })
    event.custom({ type: 'create:splashing', ingredients: [{ item: crushed }], results: results }).id('peacock:metals/splashing/crushed_raw_' + c[0])
    event.smelting('geolosys:' + c[0] + '_ingot', crushed).xp(0.1).id('peacock:metals/smelting/crushed_raw_' + c[0])
    event.blasting('geolosys:' + c[0] + '_ingot', crushed).xp(0.1).id('peacock:metals/blasting/crushed_raw_' + c[0])
  })

  // ------------------------------------------------------------ 3. lead is shot
  const LEAD_NUGGET = { tag: 'forge:nuggets/lead' }
  const LEAD_INGOT = { tag: 'forge:ingots/lead' }
  event.custom(gated('blasting', {
    type: 'minecraft:crafting_shapeless', category: 'equipment',
    ingredients: [LEAD_NUGGET, LEAD_NUGGET, LEAD_NUGGET, { item: 'minecraft:gunpowder' }, { item: 'minecraft:paper' }],
    result: { item: 'musketmod:cartridge', count: 4 },
  })).id('peacock:metals/cartridge_from_lead')
  event.custom(gated('cannons', {
    type: 'minecraft:crafting_shaped', category: 'misc',
    pattern: ['iii', 'iIi', 'iii'], key: { i: LEAD_NUGGET, I: LEAD_INGOT },
    result: { item: 'createbigcannons:shot_balls', count: 3 },
  })).id('peacock:metals/shot_balls_from_lead')
  event.custom(gated('cannons', {
    type: 'minecraft:crafting_shaped', category: 'misc',
    pattern: ['iIi', 'III', ' S '], key: { i: LEAD_NUGGET, I: LEAD_INGOT, S: { tag: 'minecraft:wooden_slabs' } },
    result: { item: 'createbigcannons:solid_shot', count: 1 },
  })).id('peacock:metals/solid_shot_from_lead')

  // ------------------------------------------------------------ 4. alloys
  function alloy(name, ingredients, count) {
    event.custom({ type: 'create:mixing', heatRequirement: 'heated', ingredients: ingredients,
      results: [{ item: 'peacock:' + name + '_ingot', count: count }] }).id('peacock:metals/mixing/' + name)
    event.shapeless('9x peacock:' + name + '_nugget', ['peacock:' + name + '_ingot']).id('peacock:metals/' + name + '_nuggets')
    event.shapeless('peacock:' + name + '_ingot', ['9x peacock:' + name + '_nugget']).id('peacock:metals/' + name + '_ingot_from_nuggets')
  }
  alloy('electrum', [{ tag: 'forge:ingots/gold' }, { tag: 'forge:ingots/silver' }], 2)
  alloy('constantan', [{ tag: 'forge:ingots/copper' }, { tag: 'forge:ingots/nickel' }], 2)
  alloy('invar', [{ tag: 'forge:ingots/iron' }, { tag: 'forge:ingots/iron' }, { tag: 'forge:ingots/nickel' }], 3)

  // ------------------------------------------------------------ 5. blocks and sheets
  BLOCKS.forEach(b => {
    event.shaped('peacock:' + b[0] + '_block', ['III', 'III', 'III'], { I: '#forge:ingots/' + b[0] }).id('peacock:metals/' + b[0] + '_block')
    event.shapeless('9x ' + b[1], ['peacock:' + b[0] + '_block']).id('peacock:metals/' + b[0] + '_ingots_from_block')
  })
  ;['aluminum', 'platinum'].forEach(m => {
    event.custom({ type: 'create:pressing', ingredients: [{ tag: 'forge:ingots/' + m }], results: [{ item: 'peacock:' + m + '_sheet' }] })
      .id('peacock:metals/pressing/' + m + '_sheet')
  })
  const PM = 'create:incomplete_precision_mechanism'
  event.custom({
    type: 'create:sequenced_assembly', ingredient: { tag: 'forge:plates/platinum' }, transitionalItem: { item: PM }, loops: 3,
    results: [{ item: 'create:precision_mechanism' }],
    sequence: [
      { type: 'create:deploying', ingredients: [{ item: PM }, { item: 'create:cogwheel' }], results: [{ item: PM }] },
      { type: 'create:deploying', ingredients: [{ item: PM }, { item: 'create:large_cogwheel' }], results: [{ item: PM }] },
      { type: 'create:deploying', ingredients: [{ item: PM }, { tag: 'forge:nuggets/iron' }], results: [{ item: PM }] },
    ],
  }).id('peacock:metals/precision_mechanism_from_platinum')
})

ServerEvents.tags('item', event => {
  Object.keys(FOLD_TAGS).forEach(id => event.remove(FOLD_TAGS[id], id))
  HIDE.forEach(id => event.add('c:hidden_from_recipe_viewers', id))
})
// ---------------------------------------------------------------- 6. villagers buy metals
// Added to a villager's own offer list when a player right-clicks it (before the trade screen opens), once it has
// the profession and level: existing villagers get them too, and the offer then lives in the villager like any other.
// Not Forge's VillagerTradesEvent: its trade table is a fastutil Int2ObjectMap, and KubeJS' Rhino wraps any Java map
// as a JS object whose every property lookup calls containsKey(String), which that map answers with a
// ClassCastException. That crashed server start on 2026-10-21.
// [profession, level, item the villager wants, how many, emeralds paid]
const BUYS = [
  ['toolsmith', 2, 'create_ironworks:tin_ingot', 6, 1],
  ['weaponsmith', 2, 'geolosys:lead_ingot', 6, 1],
  ['cleric', 2, 'geolosys:silver_ingot', 3, 1],
  ['armorer', 3, 'geolosys:nickel_ingot', 4, 1],
  ['toolsmith', 3, 'geolosys:aluminum_ingot', 5, 1],
  ['cleric', 4, 'geolosys:platinum_ingot', 1, 2],
]
const MerchantOffer = Java.loadClass('net.minecraft.world.item.trading.MerchantOffer')

ItemEvents.entityInteracted(event => {
  var v = event.target
  if (!v || String(v.type) !== 'minecraft:villager' || v.level.isClientSide()) return
  if (v.tags && v.tags.contains('peacock_npc')) return      // the capital's service people (capital_npcs.js) keep their stock
  try {
    var data = v.getVillagerData()
    var prof = String(data.getProfession().name())
    if (prof.indexOf(':') >= 0) prof = prof.substring(prof.indexOf(':') + 1)
    var level = data.getLevel()
    var offers = null
    BUYS.forEach(b => {
      if (b[0] !== prof || level < b[1]) return
      if (!offers) offers = v.getOffers()
      for (var i = 0; i < offers.size(); i++) {
        if (String(offers.get(i).getBaseCostA().id) === b[2]) return
      }
      offers.add(new MerchantOffer(Item.of(b[2], b[3]), Item.of('minecraft:emerald', b[4]), 12, 10 * b[1], 0.05))
    })
  } catch (e) { console.warn('[peacock] metals: villager trade: ' + e) }
})
})()
