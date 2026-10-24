// Peacock — the Ships datapack (illager ships and fleets; illagers in water take boats), tuned (2026-10-24).
//
// Its own default lets 50 illager-crewed boats exist at once. Every one runs its steering functions each tick, so on
// this server it is capped at 12 (the datapack's own "gamerule", a scoreboard value it reads every tick). Set on each
// server start, after the datapack's load function has made the objective.
;(() => {
ServerEvents.loaded(event => {
  event.server.runCommandSilent('scoreboard players set Game ships.gamerule.boatlimit 12')
})
})()
