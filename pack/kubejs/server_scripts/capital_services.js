// Peacock — the capital's paid services (2026-10-22). Each arrives with its Capital Works building
// (capital_projects.js); the framework is capital_npcs.js.
//
//   Smith (the Forge)          repairs the held item for emeralds by how worn it is (twice for netherite), with no XP
//                              and no "too expensive"; clears its anvil penalty; renames it.
//   Scribe (the Scriptorium)   writes a copy of any Blueprint you know, for a teammate, at half the charter price
//                              (emerald blocks) and a sheet of paper; copies written books and maps.
//   Physician (the Infirmary)  sells golden apples and potions (trade screen); on sneak: lifts harmful effects, lifts Bad
//                              Omen, cures a zombie villager brought to her (no curer's discount: you did not cure it).
//   Undertaker (the Infirmary) brings your latest corpse (Corpse mod) to the capital graveyard, priced by distance;
//                              refunded if there is nothing left to bring.
//   Courier (the Station)      sends the held item to any player; it arrives after a delay that grows with distance,
//                              as if by rail, and waits for them if they are offline.
//   Keeper (the Lighthouse)    sells a compass that always points to the lighthouse lamp.
//   Exchange (the Market)      a merchant (trade screen) selling ore from other regions, rare saplings, banner patterns
//                              and armour trims; restocks each dawn.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants.
;(() => {
const R = global.PEACOCK_ROLES = global.PEACOCK_ROLES || {}
const CompoundTag = Java.loadClass('net.minecraft.nbt.CompoundTag')
const ListTag = Java.loadClass('net.minecraft.nbt.ListTag')
const ItemStack = Java.loadClass('net.minecraft.world.item.ItemStack')
const EntityClass = Java.loadClass('net.minecraft.world.entity.Entity')
const ZombieVillager = Java.loadClass('net.minecraft.world.entity.monster.ZombieVillager')

function pos(server, key) {
  var s = String(server.persistentData.getString(key) || '')
  if (!s) return null
  var p = s.split(',').map(Number)
  return { x: p[0], y: p[1], z: p[2] }
}

// a trade recipe as SNBT: `emeralds` for `count` × `id` (with optional item tag), `uses` a day
function offer(emeralds, id, count, tag, uses) {
  return '{buy:{id:"minecraft:emerald",Count:' + emeralds + 'b},sell:{id:"' + id + '",Count:' + count + 'b' + (tag ? ',tag:' + tag : '') +
    '},maxUses:' + (uses || 8) + ',uses:0,rewardExp:0b,xp:0,priceMultiplier:0.0f,demand:0,specialPrice:0}'
}
global.PEACOCK_OFFER = offer

// ---------------------------------------------------------------- Smith
function repairPrice(item) {
  var max = item.getMaxDamage(), dmg = item.getDamageValue()
  if (!item.isDamageableItem() || max <= 0 || dmg <= 0) return 0
  return Math.max(1, Math.ceil(10 * dmg / max)) * (String(item.id).indexOf('netherite') >= 0 ? 2 : 1)
}
R.smith = {
  name: 'Smith', color: 'gold', profession: 'minecraft:armorer',
  menu: (player, npc, api) => {
    var item = player.mainHandItem
    if (item.isEmpty()) { api.say(player, 'Smith', 'gold', 'Hold the thing you want seen to, and ask again.'); return }
    var price = repairPrice(item), penalty = item.getBaseRepairCost()
    api.say(player, 'Smith', 'gold', 'Let me look at that ' + item.getHoverName().getString() + '.')
    var parts = []
    if (price) parts.push(api.button('Repair: ' + price + ' emeralds', '/peacock npc repair', 'Good as new. No XP, no "too expensive".'))
    if (penalty > 0) parts.push(api.button('Clear anvil penalty: 4 emeralds', '/peacock npc unpenalty', 'Anvils will treat it as never worked.'))
    parts.push(api.suggest('Rename: 1 emerald', '/peacock npc rename ', 'Type the new name after the command.'))
    player.tell(api.line(parts))
  },
  actions: {
    repair: (player, npc, arg, api) => {
      var item = player.mainHandItem, price = repairPrice(item)
      if (!price) { api.say(player, 'Smith', 'gold', 'Nothing wrong with that one.'); return }
      if (!api.take(player, price)) { api.poor(player, npc, price); return }
      item.setDamageValue(0)
      api.say(player, 'Smith', 'gold', 'There. It will outlast you.')
    },
    unpenalty: (player, npc, arg, api) => {
      var item = player.mainHandItem
      if (item.isEmpty() || item.getBaseRepairCost() <= 0) { api.say(player, 'Smith', 'gold', 'That has no marks on it to clear.'); return }
      if (!api.take(player, 4)) { api.poor(player, npc, 4); return }
      item.setRepairCost(0)
      api.say(player, 'Smith', 'gold', 'Reforged. Any anvil will take it like new.')
    },
    rename: (player, npc, arg, api) => {
      var item = player.mainHandItem, name = String(arg || '').trim()
      if (item.isEmpty() || !name) { api.say(player, 'Smith', 'gold', 'Hold it, and tell me the name.'); return }
      if (name.length > 40) name = name.substring(0, 40)
      if (!api.take(player, 1)) { api.poor(player, npc, 1); return }
      item.setHoverName(Text.of(name))
      api.say(player, 'Smith', 'gold', 'Stamped: ' + name + '.')
    },
  },
}

// ---------------------------------------------------------------- Scribe
function copyPrice(rung) { return Math.ceil(global.LADDER_TIER_PRICE[global.LADDER[rung].tier] / 2) }
R.scribe = {
  name: 'Scribe', color: 'aqua', profession: 'minecraft:librarian',
  menu: (player, npc, api) => {
    var known = Object.keys(global.LADDER).filter(r => player.stages.has('peacock_' + r))
    api.say(player, 'Scribe', 'aqua', known.length ? 'I can write out what you know, for a friend. Half a charter, and a sheet of paper.' : 'You know no Blueprint yet. Come back when you do.')
    var parts = known.map(r => api.button(global.LADDER[r].name + ': ' + copyPrice(r) + ' emerald blocks', '/peacock npc copy ' + r, 'Tier ' + global.LADDER[r].tier + '. Paper from your pack.'))
    for (var i = 0; i < parts.length; i += 3) player.tell(api.line(parts.slice(i, i + 3)))
    var held = String(player.mainHandItem.id)
    if (held === 'minecraft:written_book') player.tell(api.line([api.button('Copy this book: 3 emeralds', '/peacock npc copybook')]))
    if (held === 'minecraft:filled_map') player.tell(api.line([api.button('Copy this map: 2 emeralds', '/peacock npc copymap')]))
  },
  actions: {
    copy: (player, npc, arg, api) => {
      var rung = String(arg || '').trim()
      if (!global.LADDER[rung] || !player.stages.has('peacock_' + rung)) { api.say(player, 'Scribe', 'aqua', 'I can only copy what you know.'); return }
      var price = copyPrice(rung) * 9
      if (api.countItem(player, 'minecraft:paper') < 1 && !player.isCreative()) { api.say(player, 'Scribe', 'aqua', 'Bring a sheet of paper.'); return }
      if (!api.take(player, price)) { api.poor(player, npc, price); return }
      api.takeItem(player, 'minecraft:paper', 1)
      player.give(global.PEACOCK_BLUEPRINT(rung))
      api.say(player, 'Scribe', 'aqua', global.LADDER[rung].name + ', written fair. Whoever reads it will know it.')
    },
    copybook: (player, npc, arg, api) => {
      var item = player.mainHandItem
      if (String(item.id) !== 'minecraft:written_book') return
      var gen = item.nbt ? Number(item.nbt.getInt('generation')) : 0
      if (gen >= 2) { api.say(player, 'Scribe', 'aqua', 'A copy of a copy is too faint to copy again.'); return }
      if (!api.take(player, 3)) { api.poor(player, npc, 3); return }
      var c = item.copy()
      c.setCount(1)
      c.getOrCreateTag().putInt('generation', gen + 1)
      player.give(c)
      api.say(player, 'Scribe', 'aqua', 'Copied, every word.')
    },
    copymap: (player, npc, arg, api) => {
      var item = player.mainHandItem
      if (String(item.id) !== 'minecraft:filled_map') return
      if (!api.take(player, 2)) { api.poor(player, npc, 2); return }
      var c = item.copy()
      c.setCount(1)
      player.give(c)
      api.say(player, 'Scribe', 'aqua', 'A second map, line for line.')
    },
  },
}

// ---------------------------------------------------------------- Physician
const PHYSICIAN_OFFERS = '[' + [
  offer(8, 'minecraft:golden_apple', 1, null, 6),
  offer(3, 'minecraft:splash_potion', 1, '{Potion:"minecraft:weakness"}', 6),
  offer(3, 'minecraft:potion', 1, '{Potion:"minecraft:healing"}', 8),
  offer(4, 'minecraft:potion', 1, '{Potion:"minecraft:regeneration"}', 6),
  offer(1, 'minecraft:honey_bottle', 2, null, 12),
].join(',') + ']'
function harmful(player) {
  var out = [], it = player.getActiveEffects().iterator()
  while (it.hasNext()) {
    var fx = it.next().getEffect()
    if (String(fx.getCategory()) !== 'HARMFUL') continue
    var d = String(fx.getDescriptionId())        // effect.<namespace>.<path>
    var p = d.split('.')
    if (p.length >= 3 && p[2] !== 'bad_omen') out.push(p[1] + ':' + p.slice(2).join('.'))
  }
  return out
}
R.physician = {
  name: 'Physician', color: 'green', profession: 'minecraft:cleric', trades: true, offers: PHYSICIAN_OFFERS,
  menu: (player, npc, api) => {
    api.say(player, 'Physician', 'green', 'Apples and draughts are on my table. What else ails you?')
    player.tell(api.line([
      api.button('Lift what ails you: 2 emeralds', '/peacock npc cure', 'Poison, wither, weakness, slowness, hunger, nausea, blindness…'),
      api.button('Lift Bad Omen: 6 emeralds', '/peacock npc omen'),
      api.button('Cure a zombie villager: 8 emeralds', '/peacock npc zombie', 'Bring it (on a lead) within a few blocks of me.'),
    ]))
  },
  actions: {
    cure: (player, npc, arg, api) => {
      var bad = harmful(player)
      if (!bad.length) { api.say(player, 'Physician', 'green', 'You are healthier than I am.'); return }
      if (!api.take(player, 2)) { api.poor(player, npc, 2); return }
      bad.forEach(id => player.server.runCommandSilent('effect clear ' + player.username + ' ' + id))
      api.say(player, 'Physician', 'green', 'Drink this. All of it.')
    },
    omen: (player, npc, arg, api) => {
      if (!player.hasEffect(Java.loadClass('net.minecraft.world.effect.MobEffects').BAD_OMEN)) { api.say(player, 'Physician', 'green', 'No omen hangs over you.'); return }
      if (!api.take(player, 6)) { api.poor(player, npc, 6); return }
      player.server.runCommandSilent('effect clear ' + player.username + ' minecraft:bad_omen')
      api.say(player, 'Physician', 'green', 'The omen is lifted. The painted ones will not know you.')
    },
    zombie: (player, npc, arg, api) => {
      var box = new api.AABB(npc.x - 6, npc.y - 3, npc.z - 6, npc.x + 6, npc.y + 3, npc.z + 6)
      var list = npc.level.getEntitiesOfClass(ZombieVillager, box)
      if (list.isEmpty()) { api.say(player, 'Physician', 'green', 'Bring the poor soul here first, on a lead if you must.'); return }
      if (!api.take(player, 8)) { api.poor(player, npc, 8); return }
      var z = list.get(0)
      player.server.runCommandSilent('data merge entity ' + String(z.getUUID().toString()) + ' {ConversionTime:200}')
      api.say(player, 'Physician', 'green', 'Ten seconds, and they will be themselves again.')
    },
  },
}

// ---------------------------------------------------------------- Undertaker
function lastDeath(player) {
  var opt = player.getLastDeathLocation()
  if (!opt || !opt.isPresent()) return null
  var gp = opt.get(), p = gp.pos()
  return { key: gp.dimension(), dim: String(gp.dimension().location().toString()), x: p.getX(), y: p.getY(), z: p.getZ() }
}
function fetchPrice(player, d) {
  if (d.dim !== 'minecraft:overworld' || String(player.level.dimension) !== 'minecraft:overworld') return 32
  var dx = d.x - player.x, dz = d.z - player.z
  return Math.min(48, 8 + Math.floor(Math.sqrt(dx * dx + dz * dz) / 250))
}
R.undertaker = {
  name: 'Undertaker', color: 'gray', profession: 'minecraft:mason',
  menu: (player, npc, api) => {
    var d = lastDeath(player)
    if (!d) { api.say(player, 'Undertaker', 'gray', 'You have not died. Yet.'); return }
    var price = fetchPrice(player, d)
    api.say(player, 'Undertaker', 'gray', 'You fell at ' + d.x + ', ' + d.y + ', ' + d.z + (d.dim === 'minecraft:overworld' ? '' : ' (' + d.dim + ')') + '. I can bring what is left of you to the graveyard.')
    player.tell(api.line([api.button('Bring it back: ' + price + ' emeralds', '/peacock npc fetch', 'Refunded if there is nothing left to bring.')]))
  },
  actions: {
    fetch: (player, npc, arg, api) => {
      var d = lastDeath(player), gy = pos(player.server, 'peacock_graveyard')
      if (!d || !gy) { api.say(player, 'Undertaker', 'gray', 'Nothing to fetch.'); return }
      var price = fetchPrice(player, d), server = player.server, me = String(player.getUUID().toString()), name = player.username
      if (!api.take(player, price)) { api.poor(player, npc, price); return }
      api.say(player, 'Undertaker', 'gray', 'I will send the cart. Wait by the graveyard.')
      server.runCommandSilent('execute in ' + d.dim + ' run forceload add ' + d.x + ' ' + d.z)
      server.scheduleInTicks(80, () => {
        var found = 0
        try {
          var level = server.getLevel(d.key)
          var list = level.getEntitiesOfClass(EntityClass, new api.AABB(d.x - 16, d.y - 16, d.z - 16, d.x + 16, d.y + 16, d.z + 16))
          for (var i = 0; i < list.size(); i++) {
            var e = list.get(i)
            if (String(e.type) !== 'corpse:corpse') continue
            var owner = e.getCorpseUUID()
            if (!owner.isPresent() || String(owner.get().toString()) !== me) continue
            server.runCommandSilent('execute in minecraft:overworld run tp ' + String(e.getUUID().toString()) + ' ' + gy.x + ' ' + gy.y + ' ' + gy.z)
            found++
          }
        } catch (e2) { console.warn('[peacock] undertaker: ' + e2) }
        server.runCommandSilent('execute in ' + d.dim + ' run forceload remove ' + d.x + ' ' + d.z)
        var p = server.getPlayerList().getPlayerByName(name)
        if (found) { if (p) p.tell(Text.gray('Undertaker: you are in the capital graveyard now. Go and collect yourself.')) }
        else {
          if (p) { p.give(Item.of('minecraft:emerald', price)); p.tell(Text.gray('Undertaker: there was nothing left there. Your ' + price + ' emeralds back.')) }
          else console.warn('[peacock] undertaker: ' + name + ' left before a refund of ' + price)
        }
      })
    },
  },
}

// ---------------------------------------------------------------- Courier
const PARCELS = 'peacock_parcels'
const LASTPOS = 'peacock_lastpos'
function parcels(server) { return server.persistentData.getList(PARCELS, 10) }
function lastPos(server, uuid) {
  var s = String(server.persistentData.getCompound(LASTPOS).getString(uuid) || '')
  if (!s) return null
  var p = s.split(',').map(Number)
  return { x: p[0], z: p[1] }
}
PlayerEvents.loggedOut(event => {
  try {
    var data = event.player.server.persistentData, c = data.getCompound(LASTPOS)
    c.putString(String(event.player.getUUID().toString()), Math.round(event.player.x) + ',' + Math.round(event.player.z))
    data.put(LASTPOS, c)
  } catch (e) { }
})
R.courier = {
  name: 'Courier', color: 'yellow', profession: 'minecraft:cartographer',
  menu: (player, npc, api) => {
    api.say(player, 'Courier', 'yellow', 'Hold what you want sent, then name who it is for. It goes by rail: the further, the longer.')
    player.tell(api.line([api.suggest('Send held item to…', '/peacock npc send ', 'Type the player name after the command. 1 emerald + 1 per 1000 blocks.')]))
  },
  actions: {
    send: (player, npc, arg, api) => {
      var name = String(arg || '').trim(), server = player.server
      var item = player.mainHandItem
      if (item.isEmpty()) { api.say(player, 'Courier', 'yellow', 'Hold the parcel in your hand.'); return }
      var prof = server.getProfileCache().get(name)
      if (!name || !prof.isPresent()) { api.say(player, 'Courier', 'yellow', 'Nobody by that name has ever come through the capital.'); return }
      var to = String(prof.get().getId().toString())
      if (to === String(player.getUUID().toString())) { api.say(player, 'Courier', 'yellow', 'Just carry it yourself.'); return }
      var online = server.getPlayerList().getPlayerByName(name)
      var where = online ? { x: online.x, z: online.z } : lastPos(server, to)
      var dist = where ? Math.sqrt((where.x - npc.x) * (where.x - npc.x) + (where.z - npc.z) * (where.z - npc.z)) : 2000
      var price = 1 + Math.ceil(dist / 1000)
      if (!api.take(player, price)) { api.poor(player, npc, price); return }
      var tag = new CompoundTag()
      tag.putString('to', to)
      tag.putString('from', player.username)
      tag.putLong('due', api.gameTime(npc.level) + 600 + Math.round(dist))
      tag.put('item', item.save(new CompoundTag()))
      var list = parcels(server)
      list.add(tag)
      server.persistentData.put(PARCELS, list)
      var what = item.getCount() + ' ' + item.getHoverName().getString()
      item.setCount(0)
      api.say(player, 'Courier', 'yellow', what + ' for ' + name + '. On the next train; about ' + Math.ceil((600 + dist) / 20) + ' seconds.')
    },
  },
}
// deliveries: every five seconds, anything due for someone online lands in their pack
ServerEvents.tick(event => {
  var server = event.server
  if (server.tickCount % 100 !== 50) return
  try {
    var list = parcels(server)
    if (list.isEmpty()) return
    var now = Number(server.overworld().getLevelData().getGameTime()), changed = false, i
    for (i = list.size() - 1; i >= 0; i--) {
      var t = list.getCompound(i)
      if (Number(t.getLong('due')) > now) continue
      var p = server.getPlayerList().getPlayer(Java.loadClass('java.util.UUID').fromString(t.getString('to')))
      if (!p) continue
      var stack = ItemStack.of(t.getCompound('item'))
      p.give(stack)
      p.tell(Text.yellow('Courier: a parcel from ' + t.getString('from') + ' has arrived by rail: ' + stack.getCount() + ' ' + stack.getHoverName().getString() + '.'))
      list.remove(i)
      changed = true
    }
    if (changed) server.persistentData.put(PARCELS, list)
  } catch (e) { console.warn('[peacock] courier: ' + e) }
})

// ---------------------------------------------------------------- Lighthouse Keeper
R.keeper = {
  name: 'Lighthouse Keeper', color: 'blue', profession: 'minecraft:fisherman',
  menu: (player, npc, api) => {
    api.say(player, 'Lighthouse Keeper', 'blue', 'Lost? Never again. This needle knows my lamp from anywhere in the world.')
    player.tell(api.line([api.button('Lighthouse compass: 4 emeralds', '/peacock npc compass', 'Always points to the capital lighthouse.')]))
  },
  actions: {
    compass: (player, npc, arg, api) => {
      var lamp = pos(player.server, 'peacock_lighthouse_lamp')
      if (!lamp) { api.say(player, 'Lighthouse Keeper', 'blue', 'The lamp is not lit yet.'); return }
      if (!api.take(player, 4)) { api.poor(player, npc, 4); return }
      player.give(Item.of('minecraft:compass', '{LodestoneTracked:0b,LodestoneDimension:"minecraft:overworld",LodestonePos:{X:' + lamp.x + ',Y:' + lamp.y + ',Z:' + lamp.z + '},display:{Name:\'{"text":"Lighthouse Compass","color":"gold","italic":false}\'}}'))
      api.say(player, 'Lighthouse Keeper', 'blue', 'Follow the needle home.')
    },
  },
}

// ---------------------------------------------------------------- Exchange
const EXCHANGE_OFFERS = '[' + [
  offer(3, 'geolosys:tin_cluster', 4), offer(3, 'geolosys:lead_cluster', 4), offer(3, 'geolosys:zinc_cluster', 4),
  offer(4, 'geolosys:silver_cluster', 3), offer(4, 'geolosys:nickel_cluster', 3), offer(4, 'geolosys:aluminum_cluster', 3),
  offer(6, 'geolosys:platinum_cluster', 1, null, 4),
  offer(3, 'biomesoplenty:jacaranda_sapling', 1, null, 4), offer(3, 'biomesoplenty:magic_sapling', 1, null, 4),
  offer(3, 'biomesoplenty:redwood_sapling', 1, null, 4), offer(3, 'biomesoplenty:willow_sapling', 1, null, 4),
  offer(3, 'biomesoplenty:palm_sapling', 1, null, 4), offer(3, 'biomesoplenty:mahogany_sapling', 1, null, 4),
  offer(4, 'minecraft:flower_banner_pattern', 1, null, 2), offer(8, 'minecraft:globe_banner_pattern', 1, null, 2),
  offer(16, 'minecraft:coast_armor_trim_smithing_template', 1, null, 1), offer(16, 'minecraft:wild_armor_trim_smithing_template', 1, null, 1),
  offer(20, 'minecraft:sentry_armor_trim_smithing_template', 1, null, 1), offer(24, 'minecraft:dune_armor_trim_smithing_template', 1, null, 1),
  offer(6, 'minecraft:name_tag', 1, null, 4), offer(8, 'minecraft:saddle', 1, null, 2),
].join(',') + ']'
R.exchange = {
  name: 'Exchange Merchant', color: 'yellow', profession: 'minecraft:cartographer', trades: true, offers: EXCHANGE_OFFERS,
  menu: (player, npc, api) => {
    api.say(player, 'Exchange Merchant', 'yellow', 'Ore from every region, saplings from far forests, patterns and trims. Fresh stock every dawn. Shopkeepers: the stalls are yours to set up.')
  },
  actions: {},
}
})()
