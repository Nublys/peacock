// Peacock — items for the capital's economy (2026-10-22). The Steward's Contract: sold by the Clerk of the Works,
// used where a steward should live (server_scripts/steward.js). Texture drawn by script (a sealed contract).
;(() => {
StartupEvents.registry('item', event => {
  event.create('peacock:steward_contract')
    .texture('peacock:item/steward_contract')
    .maxStackSize(1)
    .rarity('uncommon')
    .tooltip(Text.gray('Use where your steward should live.'))
})
})()
