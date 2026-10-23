// Peacock — the sleep vote.
//
// Vanilla already has one: the playersSleepingPercentage gamerule. When that share of the online players is in bed
// the night (or storm) skips, and the action bar counts "x/y players sleeping" for everyone. The pack sets it on
// every start from kubejs/config/peacock.json (sleepPercent; -1 leaves the world's own value alone).
//
// The pack's old grey "[AFK]" team is gone (What Are They Up To replaced it 2026-10-18, and was itself removed
// 2026-10-22); the team is still removed from older worlds here.
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
