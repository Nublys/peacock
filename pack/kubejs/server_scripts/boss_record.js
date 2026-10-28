// Peacock — the boss record: every boss kill, who was first, how often (2026-10-28).
//
// Aaron: "Can you also add a building that logs all bosses defeated, and who defeated them first?" This keeps the record
// (server persistentData `peacock_bosses`, one compound per boss), announces a first kill to everyone, and is read by
// the Hall of Heroes (capital_projects.js: its plaques and the Chronicler). The record starts the moment this script
// is on the server, whether or not the Hall stands yet.
//
// Who counts: the same players the boss achievement goes to (achievements.js calls `add`): everyone who hit it and is
// within 128 blocks of it when it dies, or the one who struck the last blow. Those who earned the boss's achievement
// before the record existed are filled in as they log in: an advancement keeps the moment it was earned, so the first
// is whoever earned it earliest (players within two minutes of each other share it, as one fight).
//
// Per boss: first (names, ", "-separated), firstMs (when, ms since 1970), day (in-game day, 0 if not known), date
// (yyyy-mm-dd), count (kills recorded; at least 1 when only known from achievements), slayers.<name> = kills.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants.
;(() => {
const KEY = 'peacock_bosses'
const SAME_FIGHT_MS = 120000
// [achievement id, name, short name for a plaque (15 characters at most)], in the Hall's plaque order: the Blueprint
// bosses by tier, then the rest
const LIST = [
  ['mutant_zombie', 'the Mutant Zombie', 'Mutant Zombie'],
  ['mutant_enderman', 'the Mutant Enderman', 'Mutant Enderman'],
  ['mutant_skeleton', 'the Mutant Skeleton', 'Mutant Skeleton'],
  ['mutant_creeper', 'the Mutant Creeper', 'Mutant Creeper'],
  ['frostmaw', 'the Frostmaw', 'Frostmaw'],
  ['torte', 'Torte', 'Torte'],
  ['ferrous_wroughtnaut', 'the Ferrous Wroughtnaut', 'Wroughtnaut'],
  ['naga', 'the Naga', 'Naga'],
  ['invoker', 'the Invoker', 'Invoker'],
  ['spiritcaller', 'the Spiritcaller', 'Spiritcaller'],
  ['magispeller', 'the Magispeller', 'Magispeller'],
  ['freakager', 'the Freakager', 'Freakager'],
  ['ragno', 'Ragno', 'Ragno'],
  ['umvuthi', 'Umvuthi, the Sunbird', 'Umvuthi'],
  ['elder_guardian', 'the Elder Guardian', 'Elder Guardian'],
  ['radiation_director', 'the Radiation Director', 'Radiation Dir.'],
  ['leviathan', 'the Leviathan', 'Leviathan'],
  ['netherite_monstrosity', 'the Netherite Monstrosity', 'N. Monstrosity'],
  ['ancient_remnant', 'the Ancient Remnant', 'Ancient Remnant'],
  ['maledictus', 'Maledictus', 'Maledictus'],
  ['harbinger', 'the Harbinger', 'Harbinger'],
  ['ignis', 'Ignis', 'Ignis'],
  ['ender_guardian', 'the Ender Guardian', 'Ender Guardian'],
  ['scylla', 'Scylla', 'Scylla'],
  ['warden', 'the Warden', 'Warden'],
  ['mutant_snow_golem', 'the Mutant Snow Golem', 'Mut. Snow Golem'],
  ['sculptor', 'Tongbi, the Sculptor', 'Sculptor'],
  ['hovering_inferno', 'the Hovering Inferno', 'Hover. Inferno'],
  ['wither', 'the Wither', 'Wither'],
  ['ender_dragon', 'the Ender Dragon', 'Ender Dragon'],
]
const BY_ID = {}
LIST.forEach(b => { BY_ID[b[0]] = b })

function all(server) { return server.persistentData.getCompound(KEY) }
function entry(server, id) { return all(server).getCompound(id) }
function store(server, id, e) { var a = all(server); a.put(id, e); server.persistentData.put(KEY, a) }
function pad(n) { return (n < 10 ? '0' : '') + n }
function dateOf(ms) { var d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }
function dayOf(server) { return Math.floor(Number(server.overworld().getDayTime()) / 24000) + 1 }
function names(e) { var s = String(e.getString('first') || ''); return s ? s.split(', ') : [] }
function joinNames(list) {
  if (list.length <= 1) return list.join('')
  return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1]
}

// a new first (or a share of it); true if the record's first changed
function claimFirst(e, who, ms, day) {
  var have = Number(e.getLong('firstMs')) || 0
  var list = names(e)
  if (have && Math.abs(ms - have) <= SAME_FIGHT_MS) {
    var changed = false
    who.forEach(n => { if (list.indexOf(n) < 0) { list.push(n); changed = true } })
    if (ms < have) { e.putLong('firstMs', ms); e.putString('date', dateOf(ms)); changed = true }
    if (changed) e.putString('first', list.join(', '))
    return changed
  }
  if (have && have < ms) return false
  e.putString('first', who.join(', '))
  e.putLong('firstMs', ms)
  e.putString('date', dateOf(ms))
  e.putInt('day', day || 0)
  return true
}

function refreshHall(server) {
  try { if (global.PEACOCK_HALL_REFRESH) global.PEACOCK_HALL_REFRESH(server) } catch (e) { console.warn('[peacock] bosses: hall: ' + e) }
}

// a boss died; `who` are the names credited for it
function add(server, id, who) {
  if (!BY_ID[id] || !who.length) return
  var e = entry(server, id), wasKnown = !!e.getString('first'), now = Date.now(), day = dayOf(server)
  var first = claimFirst(e, who, now, day)
  e.putInt('count', e.getInt('count') + 1)
  var s = e.getCompound('slayers')
  who.forEach(n => s.putInt(n, s.getInt(n) + 1))
  e.put('slayers', s)
  store(server, id, e)
  console.info('[peacock] bosses: ' + id + ' killed by ' + who.join(', ') + (first ? ' (first)' : ''))
  if (first && !wasKnown) {
    var msg = Text.gold('⚔ First blood: ').append(Text.white(joinNames(who) + (who.length > 1 ? ' have' : ' has') + ' slain ' +
      BY_ID[id][1] + ' (Day ' + day + '). ')).append(Text.gray('Their names go up in the Hall of Heroes.'))
    server.players.forEach(p => p.tell(msg))
  }
  if (first) refreshHall(server)
}

// fill in from a player's boss achievements, earned before the record existed (or while it was not being kept)
function fromAdvancements(player) {
  var server = player.server, RL = Java.loadClass('net.minecraft.resources.ResourceLocation'), changed = false
  var name = String(player.username)
  LIST.forEach(b => {
    try {
      var adv = server.getAdvancements().getAdvancement(new RL('peacock', 'bosses/' + b[0]))
      if (!adv) return
      var prog = player.getAdvancements().getOrStartProgress(adv)
      if (!prog.isDone()) return
      var when = prog.getFirstProgressDate()
      if (!when) return
      var ms = Number(when.getTime())
      var e = entry(server, b[0])
      var slayers = e.getCompound('slayers')
      var seen = slayers.contains(name)
      var c = claimFirst(e, [name], ms, 0)
      if (!seen) { slayers.putInt(name, 1); e.put('slayers', slayers); if (!e.getInt('count')) e.putInt('count', 1); c = true }
      if (c) { store(server, b[0], e); changed = true }
    } catch (err) { console.warn('[peacock] bosses: reading ' + name + "'s " + b[0] + ': ' + err) }
  })
  return changed
}

PlayerEvents.loggedIn(event => {
  var player = event.player
  // a second later, so the player's advancements are loaded
  player.server.scheduleInTicks(20, () => { try { if (fromAdvancements(player)) refreshHall(player.server) } catch (e) { console.warn('[peacock] bosses: ' + e) } })
})

// ---------------------------------------------------------------- reading the record
function top(e) {
  var s = e.getCompound('slayers'), best = null, n = 0, it = s.getAllKeys().iterator()
  while (it.hasNext()) { var k = String(it.next()); if (s.getInt(k) > n) { n = s.getInt(k); best = k } }
  return best ? [best, n] : null
}
// four lines for a plaque sign
function plaque(server, id) {
  var b = BY_ID[id], e = entry(server, id), who = names(e)
  if (!who.length) return { lines: [b[2], '', 'not yet', 'defeated'], done: false }
  var a = who[0], rest = who.slice(1).join(', ')
  if (rest.length > 15) rest = who[1] + (who.length > 2 ? ' +' + (who.length - 2) : '')
  var when = e.getInt('day') ? 'Day ' + e.getInt('day') : String(e.getString('date') || '')
  return { lines: [b[2], a, rest, when], done: true }
}
// chat lines for the Chronicler
function chronicle(server) {
  var out = [], known = 0
  out.push(Text.gold('The Hall of Heroes: ').append(Text.white('every boss, and who brought it down first.')))
  LIST.forEach(b => {
    var e = entry(server, b[0]), who = names(e)
    if (!who.length) { out.push(Text.gray('  ' + b[1].charAt(0).toUpperCase() + b[1].slice(1) + ': undefeated')); return }
    known++
    var t = top(e), count = e.getInt('count')
    var when = e.getInt('day') ? 'Day ' + e.getInt('day') + ', ' : ''
    var line = Text.yellow('  ' + b[1].charAt(0).toUpperCase() + b[1].slice(1) + ': ').append(Text.white(joinNames(who)))
      .append(Text.gray(' (' + when + e.getString('date') + ') · slain ' + count + (count === 1 ? ' time' : ' times') +
        (t && count > 1 ? ' · most by ' + t[0] + ' (' + t[1] + ')' : '')))
    out.push(line)
  })
  out.push(Text.gray('  ' + known + ' of ' + LIST.length + ' bosses defeated.'))
  return out
}

global.PEACOCK_RECORD = { LIST: LIST, add: add, plaque: plaque, chronicle: chronicle }

// the Chronicler, who keeps the Hall of Heroes (placed by capital_projects.js when the Hall is built)
const R = global.PEACOCK_ROLES = global.PEACOCK_ROLES || {}
R.chronicler = {
  name: 'Chronicler', color: 'yellow', profession: 'minecraft:librarian',
  menu: (player, npc, api) => {
    chronicle(player.server).forEach(t => player.tell(t))
    refreshHall(player.server)
  },
  actions: {},
}
})()
