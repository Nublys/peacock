// Peacock — relay two Forge events to the server scripts (2026-10-23).
//
// KubeJS 6 lets only startup scripts listen to raw Forge events (ForgeEvents is bound for startup scripts alone), and
// startup scripts do not reload with /reload. So these hooks only forward the event to a function a server script put
// in `global`, which can be edited and reloaded freely; with nothing set, the event is untouched.
//   BabyEntitySpawnEvent → global.PEACOCK_ON_BREED (server_scripts/herd_cap.js): two animals about to make a baby,
//     cancellable.
//   ChunkEvent.Load → global.PEACOCK_ON_CHUNK_LOAD (server_scripts/wildlife_reseed.js): a chunk became a full chunk,
//     with isNewChunk() true when it was just generated rather than read from disk. Also fires for the client's
//     chunks, so the server script checks the level.
ForgeEvents.onEvent('net.minecraftforge.event.entity.living.BabyEntitySpawnEvent', event => {
  var f = global.PEACOCK_ON_BREED
  if (!f) return
  try { f(event) } catch (e) { console.warn('[peacock] breeding hook: ' + e) }
})
ForgeEvents.onEvent('net.minecraftforge.event.level.ChunkEvent$Load', event => {
  var f = global.PEACOCK_ON_CHUNK_LOAD
  if (!f) return
  try { f(event) } catch (e) { console.warn('[peacock] chunk hook: ' + e) }
})
