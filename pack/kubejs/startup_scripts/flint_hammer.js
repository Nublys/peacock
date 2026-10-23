// Peacock — the Flint Prospector's Hammer (2026-10-23).
//
// Aaron: "Is it possible to add a alternative/worse stone prospecters? So the player does not have to find iron first."
// Geolosys' prospector's pick takes metal ingots, so it came after the first metal. This hammer is made from flint, a
// cobblestone and sticks. Right-click a block: it names the ores within a 9 × 9 column from that block down 24 blocks,
// with no direction and no depth (server_scripts/flint_hammer.js). The pick says which way; the hammer only says
// whether it is worth digging here. 32 uses.
;(() => {
StartupEvents.registry('item', event => {
  event.create('peacock:flint_prospectors_hammer')
    .displayName("Flint Prospector's Hammer")
    .texture('peacock:item/flint_prospectors_hammer')
    .maxDamage(32)
    .tooltip(Text.gray('Right-click a block: which ores lie below it (24 blocks, no direction)'))
})
})()
