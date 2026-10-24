// Peacock — the capital's service people: the framework (2026-10-22).
//
// Aaron: "Can you try and ship it all?" (capital projects, the Steward, services, more trades). Every service person is
// a villager that does not wander (NoAI), cannot be hurt (except the Steward, see steward.js), and wears a name tag
// over its head. Talking to one (right-click) opens a short menu in chat with clickable choices; a choice runs
// `/peacock npc <action> [arg]`, which only works for the person you last talked to, within two minutes and eight
// blocks — the chat line cannot be used from across the map. People who also trade (the Physician, the Exchange)
// open their trade screen on a plain right-click and the menu on sneak + right-click.
//
// Roles register themselves in global.PEACOCK_ROLES from their own files:
//   { name, color, profession, menu(player, npc, api), actions: { name: (player, npc, arg, api) => … }, trades: true? }
// This file holds what they share (global.PEACOCK_NPC): spawning, paying, talking, the daily restock of traders.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants,
// every loop variable declared before its loops.
;(() => {
// Entity.distanceTo / distanceToSqr are not reachable from scripts on the server ("Cannot find function distanceTo",
// 2026-10-24: a Mutant Skeleton died and gave no Blueprint); x/y/z do work, so distance is worked out from them
function dist2(a, b) { var dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z; return dx * dx + dy * dy + dz * dz }
global.PEACOCK_ROLES = global.PEACOCK_ROLES || {}
const TALK = 'peacock_npc_talk'
const RECORDS = 'peacock_npcs'            // server persistentData: "role|uuid|dim|x|y|z;…" of every service person
const TALK_TICKS = 2400
const REACH = 8

const UUID = Java.loadClass('java.util.UUID')
const AABB = Java.loadClass('net.minecraft.world.phys.AABB')

function gameTime(level) { return Number(level.getLevelData().getGameTime()) }

function randomUuid() { return UUID.randomUUID() }
// UUID as SNBT int array; Rhino turns Java longs into doubles, so go through the hex string to keep every bit
function uuidIntArray(u) {
  var s = String(u.toString()).replace(/-/g, '')
  var parts = [0, 1, 2, 3].map(i => {
    var n = parseInt(s.substring(i * 8, i * 8 + 8), 16)
    return n > 2147483647 ? n - 4294967296 : n
  })
  return '[I;' + parts.join(',') + ']'
}

function jsonText(text, color) { return JSON.stringify({ text: text, color: color || 'gold', italic: false }) }

// spawn a service person; returns its UUID string. `offers` is an SNBT list of trade recipes or null
function spawn(server, dim, role, x, y, z, yaw, extra) {
  var r = global.PEACOCK_ROLES[role]
  var u = randomUuid()
  var name = (extra && extra.name) || r.name
  var nbt = '{UUID:' + uuidIntArray(u) + ',NoAI:1b,PersistenceRequired:1b,Silent:1b' +
    ((extra && extra.mortal) ? '' : ',Invulnerable:1b') +
    ',CustomName:' + JSON.stringify(jsonText(name, r.color)) + ',CustomNameVisible:1b' +
    ',VillagerData:{profession:"' + r.profession + '",level:5,type:"minecraft:plains"}' +
    ',Offers:{Recipes:' + ((extra && extra.offers) || '[]') + '}' +
    ',Tags:["peacock_npc","peacock_npc_' + role + '"],Rotation:[' + (yaw || 0) + 'f,0f]}'
  server.runCommandSilent('execute in ' + dim + ' run summon minecraft:villager ' + x + ' ' + y + ' ' + z + ' ' + nbt)
  var id = String(u.toString())
  var data = server.persistentData
  var list = String(data.getString(RECORDS) || '')
  data.putString(RECORDS, (list ? list + ';' : '') + [role, id, dim, x, y, z].join('|'))
  return id
}

function records(server) {
  var s = String(server.persistentData.getString(RECORDS) || '')
  return s ? s.split(';').map(t => { var p = t.split('|'); return { role: p[0], uuid: p[1], dim: p[2], x: +p[3], y: +p[4], z: +p[5] } }) : []
}
function forget(server, uuid) {
  var kept = records(server).filter(r => r.uuid !== uuid)
  server.persistentData.putString(RECORDS, kept.map(r => [r.role, r.uuid, r.dim, r.x, r.y, r.z].join('|')).join(';'))
}

function roleOf(entity) {
  if (!entity || !entity.tags || !entity.tags.contains('peacock_npc')) return null
  var it = entity.tags.iterator()
  while (it.hasNext()) {
    var t = String(it.next())
    if (t.indexOf('peacock_npc_') === 0) return t.substring('peacock_npc_'.length)
  }
  return null
}

// ---------------------------------------------------------------- money
function countEmeralds(player) {
  var inv = player.inventory, n = 0, i
  for (i = 0; i < 36; i++) {
    var s = inv.getItem(i), id = String(s.id)
    if (id === 'minecraft:emerald') n += s.count
    else if (id === 'minecraft:emerald_block') n += 9 * s.count
  }
  return n
}
// take `n` emeralds (blocks broken for change); false and nothing taken if the player has too few
function take(player, n) {
  if (n <= 0) return true
  if (player.isCreative()) return true
  if (countEmeralds(player) < n) return false
  var inv = player.inventory, left = n, i
  for (i = 0; i < 36 && left > 0; i++) {
    var s = inv.getItem(i)
    if (String(s.id) !== 'minecraft:emerald') continue
    var k = Math.min(left, s.count)
    s.shrink(k); left -= k
  }
  for (i = 0; i < 36 && left > 0; i++) {
    var b = inv.getItem(i)
    if (String(b.id) !== 'minecraft:emerald_block') continue
    var blocks = Math.min(b.count, Math.ceil(left / 9))
    b.shrink(blocks)
    var change = blocks * 9 - left
    left = 0
    if (change > 0) player.give(Item.of('minecraft:emerald', change))
  }
  return true
}
function countItem(player, id) {
  var inv = player.inventory, n = 0, i
  for (i = 0; i < 36; i++) { var s = inv.getItem(i); if (String(s.id) === id) n += s.count }
  return n
}
function takeItem(player, id, n) {
  if (player.isCreative()) return true
  if (countItem(player, id) < n) return false
  var inv = player.inventory, left = n, i
  for (i = 0; i < 36 && left > 0; i++) {
    var s = inv.getItem(i)
    if (String(s.id) !== id) continue
    var k = Math.min(left, s.count)
    s.shrink(k); left -= k
  }
  return true
}

// ---------------------------------------------------------------- talking
// colours by name; only these, so a role cannot ask for one Text lacks
const PAINT = { gold: s => Text.gold(s), yellow: s => Text.yellow(s), aqua: s => Text.aqua(s), green: s => Text.green(s),
  white: s => Text.white(s), gray: s => Text.gray(s), red: s => Text.red(s), blue: s => Text.blue(s) }
function paint(color, s) { return (PAINT[color] || PAINT.gold)(s) }
function say(player, npcName, color, text) {
  player.tell(paint(color, npcName + ': ').append(Text.white(text)))
}
function button(label, command, hover) {
  var t = Text.green('[' + label + ']').clickRunCommand(command)
  return hover ? t.hover(Text.gray(hover)) : t
}
function suggest(label, command, hover) {
  var t = Text.aqua('[' + label + ']').clickSuggestCommand(command)
  return hover ? t.hover(Text.gray(hover)) : t
}
function line(parts) {
  var t = Text.of('  ')
  parts.forEach((p, i) => { if (i) t = t.append(Text.of('  ')); t = t.append(p) })
  return t
}
function poor(player, npc, n) {
  var r = global.PEACOCK_ROLES[roleOf(npc)] || {}
  say(player, r.name || 'Clerk', r.color, 'That is ' + n + ' emerald' + (n === 1 ? '' : 's') + ', and you have ' + countEmeralds(player) + '.')
}

const api = {
  spawn: spawn, records: records, forget: forget, roleOf: roleOf, gameTime: gameTime,
  countEmeralds: countEmeralds, take: take, countItem: countItem, takeItem: takeItem,
  say: say, paint: paint, button: button, suggest: suggest, line: line, poor: poor, jsonText: jsonText, AABB: AABB, UUID: UUID,
}
global.PEACOCK_NPC = api

function openMenu(player, npc, role) {
  var r = global.PEACOCK_ROLES[role]
  if (!r || !r.menu) return
  player.persistentData.putString(TALK, role + '|' + String(npc.uuid) + '|' + gameTime(npc.level))
  try { r.menu(player, npc, api) } catch (e) { console.warn('[peacock] npc ' + role + ': menu: ' + e); player.tell(Text.red('(' + r.name + ' cannot help right now.)')) }
}

ItemEvents.entityInteracted(event => {
  var npc = event.target, player = event.player
  if (!npc || !player || npc.level.isClientSide()) return
  var role = roleOf(npc)
  if (!role) return
  if (String(event.hand) !== 'MAIN_HAND') { event.cancel(); return }
  var r = global.PEACOCK_ROLES[role]
  if (!r) return
  if (r.trades && !player.isShiftKeyDown()) return          // the trade screen opens as usual
  openMenu(player, npc, role)
  // KubeJS: cancel() throws to end the handler at once, so it must come last; before 2026-10-23 it came first
  // and the menu never opened ("right clicking on the NPCs did nothing")
  event.cancel()
})

// the person this player last talked to, if still near and recent; else null (and a hint)
function talkingTo(player) {
  var s = String(player.persistentData.getString(TALK) || '')
  if (!s) return null
  var p = s.split('|')
  var level = player.level
  if (gameTime(level) - Number(p[2]) > TALK_TICKS) { player.tell(Text.gray('Talk to them again first.')); return null }
  var npc = null
  try { npc = level.getEntity(UUID.fromString(p[1])) } catch (e) { npc = null }
  if (!npc || !npc.isAlive() || dist2(npc, player) > REACH * REACH) { player.tell(Text.gray('Talk to them again first: you have to stand near them.')); return null }
  return { role: p[0], npc: npc }
}

function run(ctx, action, arg) {
  var player = ctx.source.player
  if (!player) return 0
  var t = talkingTo(player)
  if (!t) return 0
  var r = global.PEACOCK_ROLES[t.role]
  var f = r && r.actions && r.actions[action]
  if (!f) { player.tell(Text.gray('They cannot help with that.')); return 0 }
  try { f(player, t.npc, arg, api) } catch (e) { console.warn('[peacock] npc ' + t.role + ' ' + action + ': ' + e); player.tell(Text.red('(Something went wrong; nothing was charged.)')) }
  return 1
}

ServerEvents.commandRegistry(event => {
  var Commands = event.commands, Arguments = event.arguments
  event.register(Commands.literal('peacock')
    .then(Commands.literal('npc')
      .then(Commands.argument('action', Arguments.WORD.create(event))
        .executes(ctx => run(ctx, String(Arguments.WORD.getResult(ctx, 'action')), ''))
        .then(Commands.argument('text', Arguments.GREEDY_STRING.create(event))
          .executes(ctx => run(ctx, String(Arguments.WORD.getResult(ctx, 'action')), String(Arguments.GREEDY_STRING.getResult(ctx, 'text'))))))))
})

// ---------------------------------------------------------------- daily restock for the traders
var lastDay = -1
ServerEvents.tick(event => {
  var server = event.server
  if (server.tickCount % 1200 !== 0) return
  try {
    var day = Math.floor(Number(server.overworld().getLevelData().getDayTime()) / 24000)
    if (day === lastDay) return
    var first = lastDay < 0
    lastDay = day
    if (first) return
    records(server).forEach(r => {
      var role = global.PEACOCK_ROLES[r.role]
      if (role && role.trades) server.runCommandSilent('execute in ' + r.dim + ' run data modify entity ' + r.uuid + ' Offers.Recipes[].uses set value 0')
    })
  } catch (e) { console.warn('[peacock] npc restock: ' + e) }
})
})()
