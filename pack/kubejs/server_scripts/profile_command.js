// Peacock — `/peacock profile <tier>`: pick the graphics profile in-game.
//
// The server cannot touch a player's files, so the command only validates the tier and sends it to that
// player's client (player.sendData); client_scripts/profile_client.js writes kubejs/config/peacock-profile.json, which
// peacock/launch.jar reads at the next launch (it takes priority over the PEACOCK_PROFILE variable).
// `/peacock profile <tier> reset` also asks the launcher to re-apply the whole profile over local edits once.
//
// KubeJS loads every server script into one shared scope; a bare `{}` block does not isolate `const` in
// its Rhino ("redeclaration of var"), so the body lives in a function scope.
;(() => {
const TIERS = ['potato', 'low', 'medium', 'high', 'ultra']

ServerEvents.commandRegistry(event => {
  const { commands: Commands, arguments: Arguments } = event

  function apply(ctx, reset) {
    const player = ctx.source.player
    if (!player) return 0
    const tier = String(Arguments.WORD.getResult(ctx, 'tier')).toLowerCase()
    if (TIERS.indexOf(tier) < 0) {
      player.tell(Text.red('Unknown profile "' + tier + '". Tiers: ' + TIERS.join(', ') + '.'))
      return 0
    }
    player.sendData('peacock:profile', { tier: tier, reset: !!reset })
    player.tell(Text.gold('Profile set to ' + tier + '.').append(Text.gray(' It applies at the next launch' + (reset ? ', over your own graphics edits' : '') + '.')))
    return 1
  }

  event.register(Commands.literal('peacock')
    .then(Commands.literal('profile')
      .executes(ctx => {
        const player = ctx.source.player
        if (!player) return 0
        player.tell(Text.gray('Graphics profile: /peacock profile <' + TIERS.join('|') + '>  — add "reset" to re-apply it over your own edits. Potato: no shaders, 6 chunks. Low: shaders at their lightest. Medium and up: more of everything.'))
        return 1
      })
      .then(Commands.argument('tier', Arguments.WORD.create(event))
        .executes(ctx => apply(ctx, false))
        .then(Commands.literal('reset').executes(ctx => apply(ctx, true))))))
})
})()
