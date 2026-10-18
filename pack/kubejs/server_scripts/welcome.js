// Peacock — the server's voice on arrival: a first-join line in the pack's register, and the season
// (Serene Seasons) on every join so nobody plants out of turn. The MOTD itself is static in
// server/server.properties; a live season there would need a mod, and the join line does the job.
//
// KubeJS loads every server script into one shared scope; a bare `{}` block does not isolate `const` in
// its Rhino ("redeclaration of var"), so the body lives in a function scope.
;(() => {
function seasonName(level) {
  try {
    const helper = Java.loadClass('sereneseasons.api.season.SeasonHelper')
    const sub = String(helper.getSeasonState(level).getSubSeason())      // e.g. EARLY_SPRING
    return sub.toLowerCase().split('_').join(' ')
  } catch (e) {
    return null
  }
}

PlayerEvents.loggedIn(event => {
  const player = event.player
  const season = seasonName(player.level)
  if (!player.persistentData.getBoolean('peacock_welcomed')) {
    player.persistentData.putBoolean('peacock_welcomed', true)
    player.tell(Text.gold(Text.translate('peacock.join.first')))
  }
  if (season) player.tell(Text.gray(Text.translate('peacock.join.season', Text.green(season))))
})
})()
