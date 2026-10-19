// Peacock — the fire drill's recipe: three sticks on a diagonal (the item is startup_scripts/fire_drill.js).
ServerEvents.recipes(event => {
  event.shaped('peacock:fire_drill', ['  S', ' S ', 'S  '], { S: 'minecraft:stick' }).id('peacock:fire_drill')
})
