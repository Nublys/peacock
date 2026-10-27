// Peacock — keep the capital loaded while its one-time setup runs (2026-10-27).
//
// Since 2026-10-27 the server does not keep spawn chunks loaded (ServerCore `disable-spawn-chunks`, shipped in
// pack/peacock-server/config/servercore/config.yml): the capital is spawn, and it now pauses like any other land when
// nobody is near it. Aaron: "Look into freezing the capital when no one is near" ... "Go ahead".
//
// The capital's one-time jobs run a few seconds after the server starts on a new world: the bounty board pavilions
// (capital_boards.js), the wall and its gates (capital_wall.js) and the Clerk (capital_projects.js). By then nothing
// holds the capital loaded, so while any of them has not finished, this force-loads the capital's area (spawn +-9
// chunks, as two forceload areas under the 256-chunk limit) and releases it once they are done, or after ten minutes
// whatever happens (a world whose capital is missing never sets the flags). On the existing world all of them finished
// long ago, so this does nothing.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no Math constants.
;(() => {
const FLAGS = ['peacock_capital_boards', 'peacock_board_pavilions_v4', 'peacock_board_roofs_brick',
               'peacock_capital_wall2', 'peacock_capital_wall_gates', 'peacock_capital_wall_trees', 'peacock_clerk']
const RADIUS = 9            // chunks around spawn (what the old spawn ticket kept fully ticking)
const LIMIT_TICKS = 12000   // ten minutes at most

function pending(server) {
  var pd = server.persistentData
  return FLAGS.filter(f => !pd.getBoolean(f))
}

function areas(server) {
  var sp = server.overworld().getSharedSpawnPos()
  var cx = sp.getX() >> 4, cz = sp.getZ() >> 4
  var b = c => c * 16
  // west half [cx-R, cx-1], east half [cx, cx+R]: 9 x 19 and 10 x 19 chunks
  return [[b(cx - RADIUS), b(cz - RADIUS), b(cx) - 1, b(cz + RADIUS + 1) - 1],
          [b(cx), b(cz - RADIUS), b(cx + RADIUS + 1) - 1, b(cz + RADIUS + 1) - 1]]
}

function forceload(server, on) {
  areas(server).forEach(a => server.runCommandSilent('execute in minecraft:overworld run forceload ' + (on ? 'add ' : 'remove ') + a.join(' ')))
}

ServerEvents.loaded(event => {
  var server = event.server
  var left = pending(server)
  if (!left.length) return
  forceload(server, true)
  console.info('[peacock] capital: held loaded for its first-time setup (' + left.join(', ') + ')')
  var waited = 0
  var check = () => {
    waited += 400
    var still = pending(server)
    if (still.length && waited < LIMIT_TICKS) { server.scheduleInTicks(400, check); return }
    forceload(server, false)
    console.info('[peacock] capital: setup ' + (still.length ? 'still missing ' + still.join(', ') + ' after ten minutes' : 'finished') + '; released')
  }
  server.scheduleInTicks(400, check)
})
})()
