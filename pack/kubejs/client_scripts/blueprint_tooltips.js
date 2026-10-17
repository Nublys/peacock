// Peacock — tooltips for the Blueprint ladder (client side; table from startup_scripts/peacock_ladder.js).
// Gated items say which Blueprint they need and who holds it; Blueprints say what they teach.

const L = global.LADDER

function holder(rung) {
  return L[rung].bosses.map(b => b.split('|').pop().split(':').pop().replace(/_/g, ' ')).join(' / ')
}

ItemEvents.tooltip(event => {
  // the Blueprint itself
  event.addAdvanced('peacock:blueprint', (item, advanced, text) => {
    const nbt = item.nbt
    const rung = nbt ? String(nbt.getString('tech')) : ''
    if (!L[rung]) { text.add(Text.gray('A blank sheet. Blueprints come from bosses and charters.')); return }
    const r = L[rung]
    text.add(Text.gray('Tier ' + r.tier + '. Dropped by ' + holder(rung) + '.'))
    text.add(Text.darkGray(r.story))
    text.add(Text.aqua('Right-click to learn. Tradeable; one per fighter, plus a spare.'))
  })

  // gated outputs: by explicit item list and by mod
  Object.keys(L).forEach(rung => {
    const g = L[rung].gates || {}
    const line = Text.gold('Needs Blueprint: ' + L[rung].name).append(Text.gray(' (' + holder(rung) + ')'))
    const ids = (g.outputs || []).slice()
    ;(g.outputMods || []).forEach(m => ids.push('@' + m))
    if (ids.length) event.add(ids, line)
    ;(g.inputs || []).forEach(id => event.add(id, Text.gold('Working this needs Blueprint: ' + L[rung].name)))
  })
})
