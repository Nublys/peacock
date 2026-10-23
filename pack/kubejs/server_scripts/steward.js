// Peacock — the Steward: paid offline force-loading (2026-10-22).
//
// Aaron: "Could you make it a villager itself like they are paying a manager for when they are gone." Buy a Steward's
// Contract from the Clerk of the Works (16 emeralds) and use it where he should live: a steward appears there (he
// stands still and does not wander; he can be killed, so wall him in). Pay him by talking to him. While you are
// online your land runs as normal and costs nothing; while you are offline he keeps the 3 × 3 chunks around him
// loaded (vanilla force-loading) and draws 1 emerald per chunk per 6 hours away — 9 chunks, one emerald every 40
// minutes. When his purse is empty those chunks stop until you return; nothing is lost. When you log back in he
// reports what he did. One steward per player; dismissing him refunds half his purse; if he dies the contract ends.
// FTB Chunks' own force-loading only runs while a team member is online since this change (force_load_mode NEVER,
// set for existing worlds by peacock-start.sh), so the Steward is the one way to keep a base running offline.
// persistentData `peacock_stewards`: <owner uuid> → {npc, name, dim, x, y, z, purse, loaded, last, debt, spent, since}.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants.
;(() => {
const R = global.PEACOCK_ROLES = global.PEACOCK_ROLES || {}
const KEY = 'peacock_stewards'
const CHUNKS = 9
const MS_PER_EMERALD = 6 * 3600 * 1000 / CHUNKS
const MAX_BILL_STEP = 10 * 60 * 1000          // never bill more than this per check: server downtime is free
const UUID = Java.loadClass('java.util.UUID')

function all(server) { return server.persistentData.getCompound(KEY) }
function store(server, c) { server.persistentData.put(KEY, c) }
function byNpc(server, npcUuid) {
  var c = all(server), it = c.getAllKeys().iterator()
  while (it.hasNext()) { var k = String(it.next()); if (String(c.getCompound(k).getString('npc')) === npcUuid) return k }
  return null
}
function area(r) {
  var cx = Math.floor(r.getInt('x') / 16), cz = Math.floor(r.getInt('z') / 16)
  return ((cx - 1) * 16) + ' ' + ((cz - 1) * 16) + ' ' + ((cx + 1) * 16 + 15) + ' ' + ((cz + 1) * 16 + 15)
}
function forceload(server, r, on) {
  server.runCommandSilent('execute in ' + r.getString('dim') + ' run forceload ' + (on ? 'add ' : 'remove ') + area(r))
}
function hours(purse) { return Math.round(purse * MS_PER_EMERALD / 360000) / 10 }
function online(server, owner) { return !!server.getPlayerList().getPlayer(UUID.fromString(owner)) }

ItemEvents.rightClicked('peacock:steward_contract', event => {
  var player = event.player, server = player.server
  if (player.level.isClientSide()) return
  var me = String(player.uuid), c = all(server)
  if (c.contains(me)) {
    var old = c.getCompound(me)
    player.tell(Text.gold('You already employ a steward, at ' + old.getInt('x') + ', ' + old.getInt('y') + ', ' + old.getInt('z') + '. Dismiss him first.'))
    return
  }
  var x = Math.floor(player.x), y = Math.floor(player.y), z = Math.floor(player.z), dim = String(player.level.dimension)
  var id = global.PEACOCK_NPC.spawn(server, dim, 'steward', x + 0.5, y, z + 0.5, (Math.round(player.getYRot()) + 180) % 360,
    { name: player.username + "'s Steward", mortal: true })
  var r = new (Java.loadClass('net.minecraft.nbt.CompoundTag'))()
  r.putString('npc', id); r.putString('name', player.username); r.putString('dim', dim)
  r.putInt('x', x); r.putInt('y', y); r.putInt('z', z); r.putInt('purse', 0); r.putBoolean('loaded', false)
  c.put(me, r)
  store(server, c)
  if (!player.isCreative()) event.item.shrink(1)
  player.tell(Text.gold('Your steward has arrived. ').append(Text.white('Talk to him to fill his purse; while you are away he keeps the 3×3 chunks around him running.')))
})

R.steward = {
  name: 'Steward', color: 'gold', profession: 'minecraft:librarian',
  menu: (player, npc, api) => {
    var server = player.server, owner = byNpc(server, String(npc.uuid))
    if (!owner) { api.say(player, 'Steward', 'gold', 'My employer has left me. I am only waiting now.'); return }
    var r = all(server).getCompound(owner)
    if (owner !== String(player.uuid)) { api.say(player, 'Steward', 'gold', 'I keep ' + r.getString('name') + "'s land. Not yours."); return }
    var purse = r.getInt('purse')
    api.say(player, 'Steward', 'gold', 'My purse holds ' + purse + ' emerald' + (purse === 1 ? '' : 's') + ': enough to keep your ' + CHUNKS + ' chunks running about ' + hours(purse) + ' hours while you are away.')
    player.tell(api.line([
      api.button('Pay 8', '/peacock npc pay8'), api.button('Pay 32', '/peacock npc pay32'), api.button('Pay all I carry', '/peacock npc payall'),
      api.button('Dismiss', '/peacock npc dismiss', 'He leaves, with half his purse returned to you.'),
    ]))
  },
  actions: {},
}
function pay(player, npc, n, api) {
  var server = player.server, me = String(player.uuid), owner = byNpc(server, String(npc.uuid))
  if (owner !== me) return
  if (n === 'all') n = api.countEmeralds(player)
  if (n <= 0 || !api.take(player, n)) { api.poor(player, npc, n || 1); return }
  var c = all(server), r = c.getCompound(me)
  r.putInt('purse', r.getInt('purse') + n)
  c.put(me, r); store(server, c)
  api.say(player, 'Steward', 'gold', n + ' emeralds. That keeps your land about ' + hours(r.getInt('purse')) + ' hours in all.')
}
R.steward.actions.pay8 = (player, npc, arg, api) => pay(player, npc, 8, api)
R.steward.actions.pay32 = (player, npc, arg, api) => pay(player, npc, 32, api)
R.steward.actions.payall = (player, npc, arg, api) => pay(player, npc, 'all', api)
R.steward.actions.dismiss = (player, npc, arg, api) => {
  var server = player.server, me = String(player.uuid)
  if (byNpc(server, String(npc.uuid)) !== me) return
  var c = all(server), r = c.getCompound(me), back = Math.floor(r.getInt('purse') / 2)
  if (r.getBoolean('loaded')) forceload(server, r, false)
  c.remove(me); store(server, c)
  api.forget(server, String(npc.uuid))
  npc.discard()
  if (back > 0) player.give(Item.of('minecraft:emerald', back))
  player.tell(Text.gold('Your steward bows and leaves' + (back ? ', returning ' + back + ' emeralds.' : '.')))
}

PlayerEvents.loggedOut(event => {
  var player = event.player, server = player.server, me = String(player.uuid), c = all(server)
  if (!c.contains(me)) return
  var r = c.getCompound(me)
  if (r.getInt('purse') <= 0) return
  forceload(server, r, true)
  r.putBoolean('loaded', true); r.putLong('last', Date.now()); r.putLong('since', Date.now()); r.putInt('spent', 0)
  c.put(me, r); store(server, c)
})

PlayerEvents.loggedIn(event => {
  var player = event.player, server = player.server, me = String(player.uuid), c = all(server)
  if (!c.contains(me)) return
  var r = c.getCompound(me)
  var since = Number(r.getLong('since')), spent = r.getInt('spent'), was = r.getBoolean('loaded')
  if (was) forceload(server, r, false)
  r.putBoolean('loaded', false)
  c.put(me, r); store(server, c)
  if (!since) return
  var away = Math.max(0, Date.now() - since), h = Math.floor(away / 3600000), m = Math.floor(away / 60000) % 60
  server.scheduleInTicks(60, () => {
    player.tell(Text.gold('Your steward: ').append(Text.white((was ? 'I kept your ' + CHUNKS + ' chunks running while you were away (' + h + 'h ' + m + 'm), ' :
      'your land stopped when my purse ran dry; ') + 'spent ' + spent + ' emerald' + (spent === 1 ? '' : 's') + ', ' + r.getInt('purse') + ' left in the purse.')))
  })
  r.putLong('since', 0); c.put(me, r); store(server, c)
})

// billing: every minute, for each steward keeping land while his employer is away
ServerEvents.tick(event => {
  var server = event.server
  if (server.tickCount % 1200 !== 600) return
  try {
    var c = all(server), it = c.getAllKeys().iterator(), changed = false, now = Date.now()
    while (it.hasNext()) {
      var owner = String(it.next()), r = c.getCompound(owner)
      if (!r.getBoolean('loaded')) continue
      if (online(server, owner)) { forceload(server, r, false); r.putBoolean('loaded', false); c.put(owner, r); changed = true; continue }
      var debt = Number(r.getLong('debt')) + Math.min(MAX_BILL_STEP, Math.max(0, now - Number(r.getLong('last'))))
      var purse = r.getInt('purse'), spent = r.getInt('spent')
      while (debt >= MS_PER_EMERALD && purse > 0) { purse--; spent++; debt -= MS_PER_EMERALD }
      r.putLong('debt', Math.floor(debt)); r.putLong('last', now); r.putInt('purse', purse); r.putInt('spent', spent)
      if (purse <= 0) { forceload(server, r, false); r.putBoolean('loaded', false) }
      c.put(owner, r); changed = true
    }
    if (changed) store(server, c)
  } catch (e) { console.warn('[peacock] steward: ' + e) }
})

EntityEvents.death(event => {
  var e = event.entity
  if (!e || !e.tags || !e.tags.contains('peacock_npc_steward')) return
  try {
    var server = e.level.server, npcId = String(e.uuid), owner = byNpc(server, npcId)
    global.PEACOCK_NPC.forget(server, npcId)
    if (!owner) return
    var c = all(server), r = c.getCompound(owner)
    if (r.getBoolean('loaded')) forceload(server, r, false)
    c.remove(owner); store(server, c)
    var p = server.getPlayerList().getPlayer(UUID.fromString(owner))
    if (p) p.tell(Text.red('Your steward has died. His purse is lost, and your land no longer runs while you are away.'))
  } catch (err) { console.warn('[peacock] steward death: ' + err) }
})
})()
