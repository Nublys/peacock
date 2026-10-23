// Peacock — Geolosys ore feeds Create.
//
// Create's own ore generation is off (create-common.toml: disableWorldGen = true); zinc comes from
// Geolosys sphalerite deposits as `geolosys:zinc_cluster`. Clusters are tagged into
// forge:raw_materials/<metal> (pack/config/paxi/datapacks/peacock/data/forge/tags/items/raw_materials/*.json), which is
// what Create's crushing and washing recipes already accept — so no custom processing chain here.
//
// What this script does:
//   • zinc cluster → create:zinc_ingot by smelting/blasting (Geolosys only has a recipe for its own
//     ingot, and only if that item exists).
//   • if Geolosys registered its own zinc ingot/nugget beside Create's, route every recipe output to
//     Create's and remove Geolosys' nugget crafting, so there is one zinc in the pack.

// KubeJS loads every server script into one shared scope; a bare `{}` block does not isolate `const` in
// its Rhino ("redeclaration of var"), so the body lives in a function scope.
;(() => {
ServerEvents.recipes(event => {
  const ZINC_CLUSTER = 'geolosys:zinc_cluster'

  event.smelting('create:zinc_ingot', ZINC_CLUSTER).xp(0.7).cookingTime(200).id('peacock:smelting/zinc_ingot_from_cluster')
  // Anthracite is plain coal now (2026-10-22, Aaron: fine "if it could be used in 100% of the places coal could be
  // used" — torches take only vanilla coal): its ores drop minecraft:coal (loot tables in the pack datapack), and any
  // anthracite already mined crafts into coal one for one.
  event.shapeless('minecraft:coal', ['geolosys:anthracite_coal']).id('peacock:anthracite_to_coal')
  event.blasting('create:zinc_ingot', ZINC_CLUSTER).xp(0.7).cookingTime(100).id('peacock:blasting/zinc_ingot_from_cluster')

  if (Item.exists('geolosys:zinc_ingot')) {
    event.replaceOutput({}, 'geolosys:zinc_ingot', 'create:zinc_ingot')
    event.remove({ id: 'geolosys:blasting/zinc_ingot_from_cluster_blasting' })
    event.remove({ id: 'geolosys:smelting/zinc_ingot_from_cluster_smelting' })
    event.remove({ output: 'geolosys:zinc_nugget' })
    event.remove({ output: 'geolosys:zinc_ingot' })
    event.remove({ input: 'geolosys:zinc_nugget' })
  }
})

// Hide Geolosys' duplicate zinc from EMI if it exists.
ServerEvents.tags('item', event => {
  if (Item.exists('geolosys:zinc_ingot')) {
    event.add('c:hidden_from_recipe_viewers', 'geolosys:zinc_ingot')
    event.add('c:hidden_from_recipe_viewers', 'geolosys:zinc_nugget')
  }
})
})()
