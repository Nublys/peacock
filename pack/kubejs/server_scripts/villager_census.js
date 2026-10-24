// Peacock — `/peacock villagers`: which villagers near you have no bed or no job (2026-10-24).
//
// A villager without a bed or a workstation keeps searching the land around it for one, and walks to every
// candidate it finds: in the 2026-10-24 profile that searching and walking was 5.5% of the server tick. This lists the
// adult villagers within 96 blocks of you that lack a bed (Brain memory minecraft:home) and those that lack a job site
// (minecraft:job_site; nitwits and babies are not counted, they never take one), and makes them glow for 30 seconds
// so you can find them. Give them beds and workstations and the searching stops. Read from the saved data
// (entity NBT), which is what the game itself writes; nothing is changed.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no Math constants; no distanceTo (x/y/z instead).
;(() => {
const RANGE = 96

ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event
  event.register(Commands.literal('peacock')
    .then(Commands.literal('villagers').executes(ctx => {
      var player = ctx.source.player
      if (!player) return 0
      var noBed = [], noJob = [], total = 0
      player.level.getEntities().forEach(v => {
        if (String(v.type) !== 'minecraft:villager') return
        if (Math.abs(v.x - player.x) > RANGE || Math.abs(v.z - player.z) > RANGE) return
        try {
          var nbt = v.nbt
          if (nbt.getInt('Age') < 0) return
          total++
          var mem = nbt.getCompound('Brain').getCompound('memories')
          var prof = String(nbt.getCompound('VillagerData').getString('profession'))
          if (!mem.contains('minecraft:home')) noBed.push(v)
          if (prof !== 'minecraft:nitwit' && !mem.contains('minecraft:job_site')) noJob.push(v)
        } catch (e) { console.warn('[peacock] villager census: ' + e) }
      })
      var glow = {}
      noBed.concat(noJob).forEach(v => { glow[String(v.uuid)] = true })
      Object.keys(glow).forEach(u => player.server.runCommandSilent('effect give ' + u + ' minecraft:glowing 30 0 true'))
      player.tell(Text.gold(total + ' grown villagers within ' + RANGE + ' blocks: ')
        .append(Text.white(noBed.length + ' without a bed, ' + noJob.length + ' without a job site.'))
        .append(Text.gray(Object.keys(glow).length ? ' They glow for 30 seconds.' : ' All housed and employed.')))
      var where = function (list, what) {
        if (!list.length) return
        var spots = list.slice(0, 6).map(v => Math.floor(v.x) + ' ' + Math.floor(v.y) + ' ' + Math.floor(v.z))
        player.tell(Text.gray(what + ': ' + spots.join(' | ') + (list.length > 6 ? ' …' : '')))
      }
      where(noBed, 'No bed')
      where(noJob, 'No job')
      return 1
    })))
})
})()
