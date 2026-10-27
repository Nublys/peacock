// Peacock — the Blueprint ladder, in one place.
//
// This startup script (a) registers the Blueprint item and (b) publishes the ladder as `global.LADDER`
// so the server script (server_scripts/blueprints.js) and the client tooltip script
// (client_scripts/blueprint_tooltips.js) read the same table.
//
// Each technology ("rung") lists:
//   name     shown on the Blueprint and in tooltips
//   tier     1–4, decides the charter price
//   bosses   entity ids that drop it; "minecraft:skeleton|Torte" means a vanilla mob with that name
//   gates    which crafting-table recipes get staged (Recipe Stages): by output id, by output mod,
//            by input id. Staged recipes stay visible in EMI and refuse to craft for a player without
//            the stage. Everything that gets staged is also place-gated (blueprints.js records it).
//   key      the one ingredient that makes the charter recipe unique
// Stage names are "peacock_<rung>".

// Rebalanced 2026-10-22 (Aaron: "Make the changes"): difficulty and reach decide the tier. Tier 1 is the three wild
// mutants (Brass also from the Mutant Enderman); Climate control moved to the Frostmaw and, like Torte's cooking (a
// Nether trip), to Tier 2; the raid captains share the Trading Floor; the Ancient Remnant shares Netherite; Maledictus
// holds Cannons; Scylla shares Ender logistics; the Radiation Director gets boss stats (server_scripts/boss_tuning.js).
// The Mutant Snow Golem, which only exists as a player's own pet, holds nothing.
global.LADDER = {
  brass: {
    name: 'Brass', tier: 1, bosses: ['mutantmonsters:mutant_zombie', 'mutantmonsters:mutant_enderman'], key: 'create:zinc_ingot',
    gates: { inputs: ['create:brass_ingot', 'create:brass_sheet', 'create:brass_nugget', 'create:brass_casing', 'create:brass_block', 'create:brass_hand'],
             outputs: ['create:brass_casing', 'create:brass_hand', 'create:mechanical_crafter'] },
    story: 'The dead carried the brass away. Brass is the hinge of the whole tree.',
  },
  recruiting: {
    name: 'Recruiting', tier: 1, bosses: ['mutantmonsters:mutant_skeleton'], key: 'minecraft:iron_sword',
    gates: { hire: true },
    story: 'The drill that made soldiers of farmers. Hire squads from Village Recruits.',
  },
  blasting: {
    name: 'Blasting', tier: 1, bosses: ['mutantmonsters:mutant_creeper'], key: 'minecraft:gunpowder',
    gates: { inputs: ['minecraft:gunpowder'],
             outputs: ['minecraft:tnt', 'create:empty_blaze_burner', 'musketmod:cartridge', 'musketmod:musket', 'musketmod:pistol', 'musketmod:blunderbuss', 'createbigcannons:powder_charge'] },
    story: 'Powder, fuses, the blaze burner, and the first guns.',
  },
  climate: {
    // Cold Sweat's thermal sources (2026-10-18). Campfires, furnaces, the sewing table, insulation, waterskins and
    // the thermometer are always free: nobody should freeze for want of a Blueprint.
    name: 'Climate control', tier: 2, bosses: ['mowziesmobs:frostmaw'], key: 'minecraft:snow_block',
    gates: { outputs: ['cold_sweat:hearth', 'cold_sweat:boiler', 'cold_sweat:icebox'] },
    story: 'The hearth that warms a whole house, the boiler, and the icebox. Fires, furnaces and insulation are always free.',
  },
  cooking: {
    name: 'Advanced cooking', tier: 2, bosses: ['minecraft:skeleton|Torte'], key: 'farmersdelight:cooking_pot',
    gates: { outputs: ['sliceanddice:slicer', 'sliceanddice:sprinkler'] },
    story: 'The skeleton chef Torte kept the kitchen machines. Slice & Dice automation.',
  },
  trains: {
    name: 'Trains', tier: 2, bosses: ['mowziesmobs:ferrous_wroughtnaut'], key: 'minecraft:rail',
    gates: { outputs: ['create:track', 'create:track_station', 'create:controls', 'create:schedule', 'create:train_door', 'create:train_trapdoor', 'create:track_signal', 'create:track_observer', 'create:railway_casing'],
             outputMods: ['railways'] },
    story: 'Rails, stations, schedules, and everything Steam \'n\' Rails adds.',
  },
  ships: {
    name: 'Ships', tier: 2, bosses: ['mowziesmobs:naga'], key: 'minecraft:oak_boat',
    // Eureka went with Valkyrien Skies (2026-10-24). Now: all of Small Ships (the dockyard, cannon, shot, sails), and
    // Immersive Aircraft's airships, gyrodyne, quadrocopter and every part and upgrade. The biplane, warship and
    // aircraft weapons are Cannons' (listed there; Ships names its aircraft one by one so it does not claim them).
    gates: { outputMods: ['smallships'],
             outputs: ['immersive_aircraft:airship', 'immersive_aircraft:cargo_airship', 'immersive_aircraft:gyrodyne', 'immersive_aircraft:quadrocopter',
                       'immersive_aircraft:hull', 'immersive_aircraft:sail', 'immersive_aircraft:propeller', 'immersive_aircraft:engine', 'immersive_aircraft:boiler',
                       'immersive_aircraft:enhanced_propeller', 'immersive_aircraft:eco_engine', 'immersive_aircraft:nether_engine', 'immersive_aircraft:steel_boiler',
                       'immersive_aircraft:sturdy_pipes', 'immersive_aircraft:improved_landing_gear', 'immersive_aircraft:hull_reinforcement',
                       'immersive_aircraft:industrial_gears', 'immersive_aircraft:gyroscope', 'immersive_aircraft:gyroscope_dials',
                       'immersive_aircraft:gyroscope_hud', 'immersive_aircraft:telescope'] },
    story: 'The dockyard and its ships, and airships: hulls, sails, engines and propellers.',
  },
  trade: {
    name: 'Trading Floor', tier: 2, bosses: ['illagerinvasion:invoker', 'illageandspillage:spiritcaller', 'illageandspillage:magispeller', 'illageandspillage:freakager', 'illageandspillage:ragno'], key: 'minecraft:lectern',
    gates: { outputs: ['trading_floor:trading_depot'] },
    story: 'The ledgers the illagers took. A depot sells while you are elsewhere.',
  },
  diesel: {
    name: 'Diesel', tier: 2, bosses: ['mowziesmobs:umvuthi'], key: 'minecraft:coal_block',
    gates: { outputMods: ['createdieselgenerators'] },
    story: 'Engines that do not need a river: pumpjacks, distillation, diesel.',
  },
  diving: {
    // Aaron, 2026-10-22: the Elder Guardian gets a Blueprint. Netherite diving gear is smithed from the copper pieces,
    // so it follows; water breathing potions and turtle shells stay free.
    name: 'Diving', tier: 2, bosses: ['minecraft:elder_guardian'], key: 'minecraft:prismarine_shard',
    gates: { outputs: ['create:copper_backtank', 'create:copper_diving_helmet', 'create:copper_diving_boots', 'minecraft:conduit'] },
    story: 'The old eyes in the monuments kept the deep. Backtank, diving helmet and boots, and the conduit.',
  },
  precision: {
    name: 'Precision mechanisms', tier: 3, bosses: ['minecraft:wither_skeleton|Radiation Director', 'cataclysm:the_leviathan'], key: 'create:cogwheel',
    gates: { inputs: ['create:precision_mechanism'],
             outputs: ['create:mechanical_arm', 'create:rotation_speed_controller', 'create:sequenced_gearshift', 'create:extendo_grip', 'create:potato_cannon'] },
    story: 'The reactor\'s own parts: mechanical arms, speed controllers, sequenced gearshifts.',
  },
  netherite: {
    name: 'Netherite', tier: 3, bosses: ['cataclysm:netherite_monstrosity', 'cataclysm:ancient_remnant'], key: 'minecraft:netherite_scrap',
    gates: { inputs: ['minecraft:netherite_ingot'], outputs: ['minecraft:netherite_ingot', 'minecraft:netherite_block'] },
    story: 'Working netherite: ingots, blocks, and what is built from them.',
  },
  cannons: {
    name: 'Cannons', tier: 3, bosses: ['cataclysm:maledictus'], key: 'minecraft:tnt',
    gates: { outputMods: ['createbigcannons'],
             // Immersive Aircraft's fighting machines (2026-10-24); they also need Ships for hulls and engines
             outputs: ['immersive_aircraft:biplane', 'immersive_aircraft:warship', 'immersive_aircraft:bamboo_hopper',
                       'immersive_aircraft:rotary_cannon', 'immersive_aircraft:heavy_crossbow', 'immersive_aircraft:bomb_bay'] },
    story: 'Create Big Cannons: cast, build, mount, fire. They hurt mobs and players, never the land. Also the biplane, the warship and aircraft guns.',
  },
  arcane: {
    name: 'Arcane industry', tier: 4, bosses: ['cataclysm:the_harbinger', 'cataclysm:ignis'], key: 'minecraft:enchanting_table',
    gates: { outputMods: ['create_enchantment_industry', 'create_dragons_plus'] },
    story: 'Enchantment as an industry, and dragon\'s breath as a fluid.',
  },
  ender: {
    name: 'Ender logistics', tier: 4, bosses: ['cataclysm:ender_guardian', 'cataclysm:scylla', 'minecraft:warden'], key: 'minecraft:ender_eye',
    gates: { outputs: ['minecraft:ender_chest', 'create:portable_storage_interface', 'create:portable_fluid_interface', 'create:item_vault', 'create:stockpile_switch', 'create:content_observer', 'create:smart_chute'] },
    story: 'The lost capital\'s last secret: storage that follows you, and vaults that think.',
  },
}

global.LADDER_TIER_PRICE = { 1: 2, 2: 4, 3: 6, 4: 8 }   // emerald blocks in the charter recipe

StartupEvents.registry('item', event => {
  event.create('peacock:blueprint')
    .texture('peacock:item/blueprint')
    .maxStackSize(16)
    .rarity('rare')
  // A Sealed Rumour: a bounty-board reward that unseals (right-click) into a rumour map.
  // NBT {rumour:"<id>"} names the loot table peacock:rumour/<id>; see server_scripts/journals.js.
  event.create('peacock:rumour_voucher')
    .texture('peacock:item/rumour_voucher')
    .maxStackSize(16)
    .rarity('uncommon')
})
