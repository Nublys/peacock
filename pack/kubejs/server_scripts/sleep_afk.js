// Peacock — two small server manners.
//
// 1. Sleep vote. Vanilla already has one: the playersSleepingPercentage gamerule. When that share of the
//    online players is in bed the night (or storm) skips, and the action bar counts "x/y players sleeping"
//    for everyone. The pack sets it on every start from kubejs/config/peacock.json (sleepPercent; -1 leaves
//    the world's own value alone).
// 2. AFK fade. A player who has not moved or turned for afkMinutes is put in the scoreboard team
//    `peacock_afk` (grey name, "[AFK]" prefix) — the tab list and chat show it, and nothing else changes.
//    Moving, turning or chatting takes them out again. Sleeping players are never marked.
//
// KubeJS loads every server script into one shared scope; a bare `{}` block does not isolate `const` in
// its Rhino ("redeclaration of var"), so the body lives in a function scope.
;(() => {
const SWITCHES = (() => { try { return JsonIO.read('kubejs/config/peacock.json') || {} } catch (e) { return {} } })()
const SLEEP_PERCENT = SWITCHES.sleepPercent === undefined ? 50 : Number(SWITCHES.sleepPercent)
const AFK_TICKS = (SWITCHES.afkMinutes === undefined ? 5 : Number(SWITCHES.afkMinutes)) * 60 * 20
const CHECK_EVERY = 100   // ticks
const TEAM = 'peacock_afk'

ServerEvents.loaded(event => {
  const s = event.server
  // a few seconds late on purpose: the Recruits mod listens to every command and throws if one runs before
  // it has seen the server start ("this.server is null", 2026-10-18), which aborted the team setup
  s.scheduleInTicks(60, () => {
    if (SLEEP_PERCENT >= 0) s.runCommandSilent('gamerule playersSleepingPercentage ' + Math.round(SLEEP_PERCENT))
    if (AFK_TICKS > 0) {
      s.runCommandSilent('team add ' + TEAM)
      s.runCommandSilent('team modify ' + TEAM + ' color gray')
      s.runCommandSilent('team modify ' + TEAM + ' prefix {"text":"[AFK] ","color":"dark_gray"}')
      s.runCommandSilent('team modify ' + TEAM + ' collisionRule always')
    }
    console.info('[peacock] sleep vote at ' + SLEEP_PERCENT + '%, AFK fade after ' + (AFK_TICKS / 1200) + ' min')
  })
})

// uuid -> { pose: 'x,y,z,yaw,pitch', since: tick, afk: bool }
const seen = {}

function poseOf(p) {
  return [p.x.toFixed(1), p.y.toFixed(1), p.z.toFixed(1), Math.round(p.yHeadRot), Math.round(p.xRot)].join(',')
}

function wake(server, p) {
  const st = seen[p.stringUuid]
  if (st && st.afk) {
    st.afk = false
    server.runCommandSilent('team leave ' + p.username)
  }
  if (st) { st.since = server.tickCount; st.pose = poseOf(p) }
}

ServerEvents.tick(event => {
  if (AFK_TICKS <= 0) return
  const s = event.server
  if (s.tickCount % CHECK_EVERY !== 0) return
  s.players.forEach(p => {
    const id = p.stringUuid, pose = poseOf(p)
    let st = seen[id]
    if (!st) { seen[id] = { pose: pose, since: s.tickCount, afk: false }; return }
    if (pose !== st.pose || p.sleeping) { wake(s, p); st.pose = pose; return }
    if (!st.afk && s.tickCount - st.since >= AFK_TICKS) {
      st.afk = true
      s.runCommandSilent('team join ' + TEAM + ' ' + p.username)
    }
  })
})

PlayerEvents.chat(event => { wake(event.server, event.player) })
PlayerEvents.loggedOut(event => {
  const st = seen[event.player.stringUuid]
  if (st && st.afk) event.server.runCommandSilent('team leave ' + event.player.username)
  delete seen[event.player.stringUuid]
})
})()
