// priority: 10
// Peacock — more work for the Geolosys metals and the pack's alloys (2026-10-24). Runs before blueprints.js, like
// metals.js, and wraps its own recipes in the same Recipe Stages gate as the originals they stand beside.
//
// Aaron: "Let's plan some more uses for the newly added metal beyond the spartan mod", then "Make the update". Each is
// an extra recipe beside the original, never a replacement:
//   lead       Small Ships cannonballs (3 per craft, iron makes 2) and grapeshot (2) from lead nuggets [Ships];
//              Create fluid pipes from lead sheets and an ingot (4), as copper gives — lead pipes
//   tin        lanterns and soul lanterns from tin nuggets
//   silver     two Create electron tubes from polished rose quartz and a silver ingot (iron sheet gives one)
//   aluminium  the airship metal: Immersive Aircraft hulls (2) and propellers (2) from aluminium sheets [Ships]
//   platinum   Immersive Aircraft's eco engine with platinum sheets for gold [Ships]; two diesel engines with a
//              platinum sheet as the spark in place of flint and steel [Diesel]
//   bronze     Small Ships' cannon cast from bronze blocks, as real ship guns were [Ships]
//   constantan instruments: Cold Sweat's thermometer (constantan for gold: thermocouples are made of it) and the
//              aircraft telescope [Ships]
//   invar      heat-proof fittings from invar sheets: Cold Sweat's hearth [Climate control], Immersive Aircraft's
//              boiler and steel boiler [Ships]
//   electrum   signal parts: two Create transmitters from an electrum ingot and redstone (redstone links, display
//              links); a content observer with an electrum ingot for the electron tube [Ender logistics]
// Also: the Ships fleets' treasure and supply chests carry the rare metals (silver, platinum, electrum) a fighter
// brings home for engines and instruments.
// Sheets: lead and invar are new (startup_scripts/metals.js), pressed like the others.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no Math constants.
;(() => {
const SW = (() => { try { return JsonIO.read('kubejs/config/peacock.json') || {} } catch (e) { return {} } })()
const LADDER_ON = SW.ladder !== false
function gated(rung, json) {
  if (!LADDER_ON || !rung) return json
  return { type: json.type === 'minecraft:crafting_shaped' ? 'recipestages:shaped_stage' : 'recipestages:stage', stage: 'peacock_' + rung, recipe: json }
}
function key(k) {
  var out = {}
  Object.keys(k).forEach(c => { var v = k[c]; out[c] = v.charAt(0) === '#' ? { tag: v.substring(1) } : { item: v } })
  return out
}
function shaped(event, id, rung, result, count, pattern, k) {
  event.custom(gated(rung, { type: 'minecraft:crafting_shaped', pattern: pattern, key: key(k), result: { item: result, count: count } }))
    .id('peacock:metal_uses/' + id)
}

ServerEvents.recipes(event => {
  ;['lead', 'invar'].forEach(m => {
    event.custom({ type: 'create:pressing', ingredients: [{ tag: 'forge:ingots/' + m }], results: [{ item: 'peacock:' + m + '_sheet' }] })
      .id('peacock:metals/pressing/' + m + '_sheet')
  })
  // lead
  shaped(event, 'lead_cannon_ball', 'ships', 'smallships:cannon_ball', 3, [' # ', '#G#', ' # '], { '#': '#forge:nuggets/lead', G: 'minecraft:gunpowder' })
  shaped(event, 'lead_grape_shot', 'ships', 'smallships:grape_shot', 2, ['nnn', 'nGn', 'nnn'], { n: '#forge:nuggets/lead', G: 'minecraft:gunpowder' })
  shaped(event, 'lead_fluid_pipe', null, 'create:fluid_pipe', 4, ['SCS'], { S: '#forge:plates/lead', C: '#forge:ingots/lead' })
  // tin
  shaped(event, 'tin_lantern', null, 'minecraft:lantern', 1, ['nnn', 'nTn', 'nnn'], { n: '#forge:nuggets/tin', T: 'minecraft:torch' })
  shaped(event, 'tin_soul_lantern', null, 'minecraft:soul_lantern', 1, ['nnn', 'nTn', 'nnn'], { n: '#forge:nuggets/tin', T: 'minecraft:soul_torch' })
  // silver
  shaped(event, 'silver_electron_tube', null, 'create:electron_tube', 2, ['L', 'N'], { L: 'create:polished_rose_quartz', N: '#forge:ingots/silver' })
  // aluminium
  shaped(event, 'aluminum_hull', 'ships', 'immersive_aircraft:hull', 2, ['LLL', 'SSS', 'LLL'], { L: '#minecraft:logs', S: '#forge:plates/aluminum' })
  shaped(event, 'aluminum_propeller', 'ships', 'immersive_aircraft:propeller', 2, ['SS ', ' S ', ' SS'], { S: '#forge:plates/aluminum' })
  // platinum
  shaped(event, 'platinum_eco_engine', 'ships', 'immersive_aircraft:eco_engine', 1, ['CNC', 'NEN', 'RRR'],
    { C: 'minecraft:slime_ball', N: '#forge:plates/platinum', E: 'immersive_aircraft:engine', R: 'minecraft:brick' })
  shaped(event, 'platinum_diesel_engine', 'diesel', 'createdieselgenerators:diesel_engine', 2, [' Q ', 'PBP', 'SFS'],
    { Q: '#forge:plates/platinum', P: 'createdieselgenerators:engine_piston', B: '#forge:storage_blocks/brass', S: 'minecraft:polished_blackstone_slab', F: 'create:fluid_tank' })
  // bronze
  shaped(event, 'bronze_ship_cannon', 'ships', 'smallships:cannon', 1, ['  S', 'III', ' LL'], { S: 'minecraft:string', I: 'create_ironworks:bronze_block', L: '#minecraft:logs' })
  // constantan
  shaped(event, 'constantan_thermometer', null, 'cold_sweat:thermometer', 1, ['GRG', ' R ', ' R '], { G: '#forge:ingots/constantan', R: 'minecraft:redstone' })
  shaped(event, 'constantan_telescope', 'ships', 'immersive_aircraft:telescope', 1, ['T', 'C'], { T: 'minecraft:spyglass', C: '#forge:ingots/constantan' })
  // invar
  shaped(event, 'invar_hearth', 'climate', 'cold_sweat:hearth', 1, [' # ', 'BBB', 'SIS'],
    { '#': 'cold_sweat:smokestack', B: '#forge:ingots/nether_brick', S: '#minecraft:soul_fire_base_blocks', I: '#forge:plates/invar' })
  shaped(event, 'invar_boiler', 'ships', 'immersive_aircraft:boiler', 1, ['CCC', 'CFC'], { C: '#forge:plates/invar', F: 'minecraft:furnace' })
  shaped(event, 'invar_steel_boiler', 'ships', 'immersive_aircraft:steel_boiler', 1, ['CCC', 'CBC', 'CFC'],
    { C: '#forge:plates/invar', B: 'immersive_aircraft:boiler', F: 'minecraft:blast_furnace' })
  // electrum
  shaped(event, 'electrum_transmitter', null, 'create:transmitter', 2, ['E', 'R'], { E: '#forge:ingots/electrum', R: '#forge:dusts/redstone' })
  shaped(event, 'electrum_content_observer', 'ender', 'create:content_observer', 1, ['R', 'B', 'I'],
    { R: '#forge:ingots/electrum', B: 'create:brass_casing', I: 'minecraft:observer' })
})

// item, weight, [min, max]
const FLEET_METALS = [
  ['geolosys:silver_ingot', 6, [1, 3]],
  ['geolosys:silver_cluster', 4, [1, 2]],
  ['geolosys:platinum_cluster', 3, [1, 1]],
  ['geolosys:platinum_ingot', 2, [1, 1]],
  ['peacock:electrum_nugget', 4, [3, 8]],
]
ServerEvents.chestLootTables(event => {
  ;['ships:chests/ship_treasure', 'ships:chests/ship_supply'].forEach(id => {
    event.modify(id, table => {
      table.addPool(pool => {
        pool.setUniformRolls(id.indexOf('treasure') >= 0 ? 1 : 0, 2)
        FLEET_METALS.forEach(e => {
          pool.addItem(e[0], e[1]).addFunction({ function: 'minecraft:set_count', count: { type: 'minecraft:uniform', min: e[2][0], max: e[2][1] } })
        })
      })
    })
  })
})
})()
