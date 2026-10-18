// Peacock — client half of `/peacock profile`: write kubejs/config/peacock-profile.json for launch.jar to read next launch.
;(() => {
NetworkEvents.dataReceived('peacock:profile', event => {
  const tier = String(event.data.getString('tier'))
  const reset = event.data.getBoolean('reset')
  try {
    JsonIO.write('kubejs/config/peacock-profile.json', reset ? { tier: tier, reset: true } : { tier: tier })
    console.info('[peacock] profile.json -> ' + tier + (reset ? ' (reset)' : ''))
  } catch (e) {
    console.error('[peacock] could not write kubejs/config/peacock-profile.json: ' + e)
    if (event.player) event.player.tell(Text.red('Could not write kubejs/config/peacock-profile.json — set PEACOCK_PROFILE=' + tier + ' in Prism instead.'))
  }
})
})()
