// Peacock — the sleep vote.
//
// Vanilla already has one: the playersSleepingPercentage gamerule. When that share of the online players is in bed
// the night (or storm) skips, and the action bar counts "x/y players sleeping" for everyone. The pack sets it on
// every start from kubejs/config/peacock.json (sleepPercent; -1 leaves the world's own value alone).
//
// Idle players are shown by What Are They Up To since 2026-10-18 (a "Zz" in the tab list and a sleeping player in
// the world after five minutes still); the pack's own grey "[AFK]" team is gone, and removed from older worlds here.
//
// KubeJS loads every server script into one shared scope, so the body lives in a function scope.
;(() => {
const SWITCHES = (() => { try { return JsonIO.read('kubejs/config/peacock.json') || {} } catch (e) { return {} } })()
const SLEEP_PERCENT = SWITCHES.sleepPercent === undefined ? 50 : Number(SWITCHES.sleepPercent)

ServerEvents.loaded(event => {
  const s = event.server
  // a few seconds late on purpose: the Recruits mod listens to every command and throws if one runs before
  // it has seen the server start ("this.server is null", 2026-10-18)
  s.scheduleInTicks(60, () => {
    if (SLEEP_PERCENT >= 0) s.runCommandSilent('gamerule playersSleepingPercentage ' + Math.round(SLEEP_PERCENT))
    s.runCommandSilent('team remove peacock_afk')
    console.info('[peacock] sleep vote at ' + SLEEP_PERCENT + '%')
  })
})
})()
