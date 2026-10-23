// Peacock — the backpack takes any common metal, not only iron (2026-10-23).
//
// Aaron: "update the backpack recipe to also accept metal ingots of a similar value, not just iron." Metal is
// regional here (Geolosys), so a settler far from iron could not make a backpack. Backpacked's recipe (3 leather,
// iron, string, iron, 3 leather) now takes, in each of the two metal slots, any ingot of the pack's common
// metals: iron, copper, tin, zinc, lead, nickel or aluminium (two different ones are fine). Gold, silver, platinum
// and the alloys (bronze, brass, steel, electrum, constantan, invar) are worth more and stay out.
// Tag: peacock:backpack_metals; recipe peacock:backpack replaces backpacked:backpack.
;(() => {
const METALS = ['#forge:ingots/iron', '#forge:ingots/copper', 'create_ironworks:tin_ingot', 'create:zinc_ingot',
  'geolosys:lead_ingot', 'geolosys:nickel_ingot', 'geolosys:aluminum_ingot']

ServerEvents.tags('item', event => {
  METALS.forEach(m => event.add('peacock:backpack_metals', m))
})

ServerEvents.recipes(event => {
  event.remove({ id: 'backpacked:backpack' })
  event.shaped('backpacked:backpack', ['LLL', 'SIS', 'LLL'], {
    L: '#forge:leather', I: '#forge:string', S: '#peacock:backpack_metals',
  }).id('peacock:backpack')
})
})()
