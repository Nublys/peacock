// Peacock — tooltip for the Sealed Rumour (client side). Names mirror server_scripts/journals.js.
;(() => {
const NAMES = {
  wrought_chamber: 'the Iron Knight\'s chamber', frostmaw: 'the sleeping giant of the snows',
  umvuthana_grove: 'the sun chief\'s grove', monastery: 'the monastery on the peaks', illager_fort: 'the illager fort',
  cursed_pyramid: 'the cursed pyramid', frosted_prison: 'the frosted prison', ancient_factory: 'the factory under the ground',
  sunken_city: 'the sunken city', acropolis: 'the acropolis in the warm sea',
  survivors_tower: 'smoke from a new tower',
}
ItemEvents.tooltip(event => {
  event.addAdvanced('peacock:rumour_voucher', (item, advanced, text) => {
    const id = item.nbt ? String(item.nbt.getString('rumour')) : ''
    text.add(Text.gray(Text.translate('peacock.rumour.tooltip')))
    if (NAMES[id]) text.add(Text.gold('Concerning ' + NAMES[id] + '.'))
  })
})
})()
