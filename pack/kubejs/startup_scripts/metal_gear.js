// Peacock — tools and armour for every metal that had none (2026-10-24).
//
// Aaron: "For the new ores and ingots could you also add a mod or custom make them useful as pickaxes, axes, shovels,
// armor, ect all the basic metal role in Minecraft" (hoes in; lead armour: knockback resistance only). Create:
// Ironworks already gives copper, bronze, brass and steel full sets; these are the other nine: tin, lead, silver,
// nickel, aluminium, electrum, constantan, invar, platinum. Each has pickaxe, axe, shovel, hoe, sword, helmet,
// chestplate, leggings and boots, repaired with its own ingot; recipes in server_scripts/metal_gear.js (no Blueprint).
// Textures: vanilla iron's, recoloured to each ingot by tools/gen-metal-gear.py.
//
// Each metal has a character, set around vanilla and Ironworks' numbers (tool: uses / speed / damage bonus / mining
// level / enchantability; vanilla iron 250/6/2/2/14, diamond 1561/8/3/3/10, gold 32/12/0/0/22; Ironworks copper
// 144/5/1.25/1/12, bronze 480/5.5/1.5/2/15, brass 240/6.5/2.5/2/22, steel 1476/8/3.5/3/11):
//   tin        soft and early: stone-level mining, a bit better than copper
//   lead       heavy: iron mining, slow swing, hits harder; armour shrugs off knockback
//   silver     soft and enchantable; its weapons and tools do 50% more to the undead (server_scripts/metal_gear.js)
//   nickel     iron that lasts longer
//   aluminium  light: fast, wears quickly, takes enchantments well
//   electrum   gold that is usable: very fast, best enchantability, fragile
//   constantan the workhorse: between iron and steel
//   invar      hard-wearing: iron mining, very long life; armour has a little toughness
//   platinum   rare: diamond-level mining, close to diamond's life, most enchantable of the strong metals
// Armour: durability multiplier (iron 15, diamond 33), protection [boots, legs, chest, helmet] (iron 2/5/6/2,
// diamond 3/6/8/3), toughness, knockback resistance per piece (netherite 0.1), enchantability (iron 9).
//
// Rhino notes (see tools/validate.py): `var` inside functions, no Math constants.
;(() => {
// tool:  uses, speed, damage bonus, level, enchantability;  armour: multiplier, protection, toughness, kb, ench
const METALS = {
  tin:        { ingot: '#forge:ingots/tin',        tool: [160, 5.0, 1.0, 1, 12],  armour: [11, [1, 4, 5, 2], 0, 0, 10] },
  lead:       { ingot: '#forge:ingots/lead',       tool: [260, 4.5, 2.5, 2, 8],   armour: [15, [2, 5, 6, 2], 0, 0.1, 7], heavy: true },
  silver:     { ingot: '#forge:ingots/silver',     tool: [200, 8.0, 1.5, 2, 22],  armour: [13, [2, 5, 6, 2], 0, 0, 22] },
  nickel:     { ingot: '#forge:ingots/nickel',     tool: [350, 6.0, 2.0, 2, 12],  armour: [20, [2, 5, 6, 2], 0, 0, 10] },
  aluminum:   { ingot: '#forge:ingots/aluminum',   tool: [180, 7.5, 1.5, 2, 16],  armour: [14, [2, 4, 5, 2], 0, 0, 15] },
  electrum:   { ingot: '#forge:ingots/electrum',   tool: [120, 11.0, 1.0, 2, 25], armour: [9,  [1, 3, 5, 2], 0, 0, 25] },
  constantan: { ingot: '#forge:ingots/constantan', tool: [420, 6.5, 2.0, 2, 14],  armour: [22, [2, 5, 7, 2], 0, 0, 12] },
  invar:      { ingot: '#forge:ingots/invar',      tool: [640, 6.0, 2.0, 2, 12],  armour: [26, [2, 5, 6, 2], 1, 0, 10] },
  platinum:   { ingot: '#forge:ingots/platinum',   tool: [1200, 8.0, 3.0, 3, 18], armour: [30, [3, 6, 7, 3], 1.5, 0, 18] },
}
global.PEACOCK_GEAR_METALS = METALS
const TOOL_TAG = { pickaxe: 'pickaxes', axe: 'axes', shovel: 'shovels', hoe: 'hoes', sword: 'swords' }
const ARMOUR_TAG = { helmet: 'helmets', chestplate: 'chestplates', leggings: 'leggings', boots: 'boots' }

ItemEvents.toolTierRegistry(event => {
  Object.keys(METALS).forEach(m => {
    var t = METALS[m].tool
    event.add('peacock:' + m, tier => {
      tier.uses = t[0]; tier.speed = t[1]; tier.attackDamageBonus = t[2]; tier.level = t[3]; tier.enchantmentValue = t[4]
      tier.repairIngredient = METALS[m].ingot
    })
  })
})

// armour tier names carry the namespace, so the worn texture is peacock:textures/models/armor/<metal>_layer_1/2.png;
// the tier starts as a copy of iron (equip sound and the rest), these lines change the numbers
ItemEvents.armorTierRegistry(event => {
  Object.keys(METALS).forEach(m => {
    var a = METALS[m].armour
    event.add('peacock:' + m, tier => {
      tier.durabilityMultiplier = a[0]; tier.slotProtections = a[1]; tier.toughness = a[2]; tier.knockbackResistance = a[3]
      tier.enchantmentValue = a[4]; tier.repairIngredient = METALS[m].ingot
    })
  })
})

StartupEvents.registry('item', event => {
  Object.keys(METALS).forEach(m => {
    Object.keys(TOOL_TAG).forEach(piece => {
      var b = event.create('peacock:' + m + '_' + piece, piece).tier('peacock:' + m)
        .tag('forge:tools').tag('forge:tools/' + TOOL_TAG[piece])
      // lead swings slower (iron sword -2.4, axe -3.1)
      if (METALS[m].heavy && piece === 'sword') b.speedBaseline(-2.7)
      if (METALS[m].heavy && piece === 'axe') b.speedBaseline(-3.3)
      if (piece === 'sword') b.tag('forge:tools/weapons')
    })
    Object.keys(ARMOUR_TAG).forEach(piece => {
      event.create('peacock:' + m + '_' + piece, piece).tier('peacock:' + m)
        .tag('forge:armors').tag('forge:armors/' + ARMOUR_TAG[piece]).tag('minecraft:trimmable_armor')
    })
  })
})
})()
