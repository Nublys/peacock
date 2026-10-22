// Peacock — Blueprints: how technology comes back, per player.
//
// Table: startup_scripts/peacock_ladder.js (global.LADDER). This script:
//   1. Stages recipes.  Every crafting-table recipe a rung gates is wrapped in a Recipe Stages recipe
//      (recipestages:stage / recipestages:shaped_stage) with stage "peacock_<rung>". The recipe stays
//      visible in EMI; the table refuses to craft it for a player without the stage.
//   2. Charter recipes.  Every rung has a shapeless fallback: paper + emerald blocks (2/4/6/8 by tier)
//      + one key item -> that rung's Blueprint. Expensive, never blocked.
//   3. Boss drops.  Damage dealt to a listed boss is remembered on the entity; on death every player who
//      hit it and is within 128 blocks receives a Blueprint, plus one spare dropped on the ground.
//   4. Using a Blueprint grants the stage and consumes it; using one you already know does nothing.
//   5. Gates in play: placing a block whose recipe was staged, and hiring Village Recruits, both need
//      the stage. Creative players bypass.
// Switch: "ladder" in kubejs/config/peacock.json (false = nothing is staged or gated; drops still work).

// KubeJS loads every server script into one shared scope; a bare `{}` block does not isolate `const` in
// its Rhino ("redeclaration of var"), so the body lives in a function scope.
;(() => {
const SW = (() => { try { return JsonIO.read('kubejs/config/peacock.json') || {} } catch (e) { return {} } })()
const LADDER_ON = SW.ladder !== false
const L = global.LADDER
const STAGE = rung => 'peacock_' + rung

// everything whose recipe got staged, by item id -> rung; filled while recipes load, read by the place gate
global.PEACOCK_GATED_ITEMS = {}

function blueprint(rung, count) {
  const r = L[rung]
  return Item.of('peacock:blueprint', count || 1, {
    tech: rung,
    display: {
      Name: JSON.stringify({ text: 'Blueprint: ' + r.name, color: 'aqua', italic: false }),
      Lore: [JSON.stringify({ text: 'Tier ' + r.tier + '. Use to learn.', color: 'gray', italic: false })],
    },
  })
}

// the Scribe (capital_services.js) writes copies with the same function
global.PEACOCK_BLUEPRINT = blueprint

// ---------------------------------------------------------------- 1 + 2: recipes
ServerEvents.recipes(event => {
  // charter recipes first, so the staging pass below can skip them
  Object.keys(L).forEach(rung => {
    const r = L[rung]
    const ingredients = ['minecraft:paper', r.key]
    for (var i = 0; i < global.LADDER_TIER_PRICE[r.tier]; i++) ingredients.push('minecraft:emerald_block')
    event.shapeless(blueprint(rung), ingredients).id('peacock:charter/' + rung)
  })

  if (!LADDER_ON) { console.info('[peacock] ladder disabled by kubejs/config/peacock.json: no recipes staged'); return }

  const wrapped = {}   // original recipe id -> rung
  let staged = 0

  function stage(recipe, rung) {
    const id = recipe.getId()
    if (!id || id.startsWith('peacock:') || id.startsWith('recipestages:') || wrapped[id]) return
    const type = String(recipe.getType())
    if (type !== 'minecraft:crafting_shaped' && type !== 'minecraft:crafting_shapeless') return
    // recipe.json is a Gson JsonObject: String() gives compact JSON; JSON.stringify would dump its Java members
    const json = JSON.parse(String(recipe.json))
    const out = json.result && (json.result.item || json.result.id)
    wrapped[id] = rung
    event.remove({ id: id })
    event.custom({
      type: type === 'minecraft:crafting_shaped' ? 'recipestages:shaped_stage' : 'recipestages:stage',
      stage: STAGE(rung),
      recipe: json,
    }).id('peacock:staged/' + rung + '/' + id.replace(':', '/'))
    if (out) global.PEACOCK_GATED_ITEMS[out] = rung
    staged++
  }

  Object.keys(L).forEach(rung => {
    const g = L[rung].gates || {}
    ;(g.outputs || []).forEach(id => event.forEachRecipe({ output: id }, r => stage(r, rung)))
    ;(g.inputs || []).forEach(id => event.forEachRecipe({ input: id }, r => stage(r, rung)))
    ;(g.outputMods || []).forEach(mod => event.forEachRecipe({ output: '@' + mod }, r => stage(r, rung)))
    // the gate list itself is place-gated even when the item is not crafted (e.g. machine-made)
    ;(g.outputs || []).forEach(id => { global.PEACOCK_GATED_ITEMS[id] = rung })
  })
  console.info('[peacock] ladder: ' + staged + ' recipes staged across ' + Object.keys(L).length + ' rungs')
})

// ---------------------------------------------------------------- 3: boss drops
function rungsFor(entity) {
  const type = String(entity.type)
  const name = entity.hasCustomName() ? String(entity.customName.getString()) : ''
  const found = []
  Object.keys(L).forEach(rung => {
    L[rung].bosses.forEach(b => {
      const parts = b.split('|')
      if (parts[0] !== type) return
      if (parts.length > 1 && name.indexOf(parts[1]) < 0) return
      found.push(rung)
    })
  })
  return found
}

const BOSS_TYPES = {}
Object.keys(L).forEach(rung => L[rung].bosses.forEach(b => { BOSS_TYPES[b.split('|')[0]] = true }))

EntityEvents.hurt(event => {
  const boss = event.entity
  if (!BOSS_TYPES[String(boss.type)]) return
  const attacker = event.source.actual          // KubeJS: the entity behind the damage (getEntity() is not exposed)
  if (!attacker || !attacker.isPlayer()) return
  const uuid = String(attacker.uuid)
  const list = boss.persistentData.getString('peacock_fighters')
  if (list.indexOf(uuid) >= 0) return
  boss.persistentData.putString('peacock_fighters', list ? list + ',' + uuid : uuid)
})

EntityEvents.death(event => {
  const boss = event.entity
  if (!BOSS_TYPES[String(boss.type)]) return
  const rungs = rungsFor(boss)
  if (!rungs.length) return
  const fighters = (boss.persistentData.getString('peacock_fighters') || '').split(',').filter(s => s.length)
  const level = boss.level
  let given = 0
  fighters.forEach(uuid => {
    const p = level.server.getPlayerList().getPlayer(UUID.fromString(uuid))
    if (!p || String(p.level.dimension) !== String(level.dimension) || p.distanceTo(boss) > 128) return
    rungs.forEach(rung => p.give(blueprint(rung)))
    p.tell(Text.aqua('A Blueprint falls from the ' + String(boss.name.getString()) + '. Use it to learn.'))
    given++
  })
  // one spare for someone who was not there (two if nobody who hit it was still around)
  rungs.forEach(rung => boss.block.popItem(blueprint(rung, given ? 1 : 2)))
})

// ---------------------------------------------------------------- 4: using a Blueprint
ItemEvents.rightClicked('peacock:blueprint', event => {
  const player = event.player
  const nbt = event.item.nbt
  const rung = nbt ? String(nbt.getString('tech')) : ''
  if (!L[rung]) { player.tell(Text.red('This Blueprint is blank.')); return }
  if (player.stages.has(STAGE(rung))) {
    player.tell(Text.gray('You already know ' + L[rung].name + '. Trade this to someone who does not.'))
    return
  }
  player.stages.add(STAGE(rung))
  if (!player.isCreative()) event.item.shrink(1)
  player.tell(Text.aqua('You study the Blueprint. ').append(Text.white(L[rung].name)).append(Text.aqua(' is yours to build.')))
  player.tell(Text.gray(L[rung].story))
})

// ---------------------------------------------------------------- 5: gates in play
function deny(player, rung, what) {
  const r = L[rung]
  player.tell(Text.red(what + ' needs the ').append(Text.aqua('Blueprint: ' + r.name)).append(Text.red('. ')).append(Text.gray(r.bosses.map(b => b.split('|').pop().split(':').pop().replace(/_/g, ' ')).join(' / ') + ' holds it.')))
}

BlockEvents.placed(event => {
  if (!LADDER_ON) return
  const player = event.player
  if (!player || player.isCreative()) return
  const rung = global.PEACOCK_GATED_ITEMS[String(event.block.id)]
  if (!rung || player.stages.has(STAGE(rung))) return
  event.cancel()
  deny(player, rung, 'Placing this')
})

ItemEvents.entityInteracted(event => {
  if (!LADDER_ON) return
  const player = event.player
  if (!player || player.isCreative()) return
  const target = event.target
  if (!target || String(target.type).indexOf('recruits:') !== 0) return
  if (player.stages.has(STAGE('recruiting'))) return
  // owned recruits can still be commanded; hiring (a stranger, with emeralds in hand) is the gate
  if (String(event.item.id) !== 'minecraft:emerald') return
  event.cancel()
  deny(player, 'recruiting', 'Hiring')
})
})()
