// Peacock — breath you can see when Cold Sweat says the air is cold (client only).
//
// Aaron, 2026-10-21: "Disable the breath fog and write something custom so it's tied to cold sweats." Subtle
// Effects' Frosty Breath showed in any snowy biome and, with Serene Seasons, in every biome from late autumn to early
// spring, whatever the temperature, so it was on nearly all the time. It is off (displayType "OFF", profiles), and
// this script draws the same puff (Subtle Effects' `frosty_breath` particle, its placement and rhythm) from Cold
// Sweat's own numbers instead.
//
// It follows the outside air, not the player (Aaron: "they can have warm clothes on but have the fog breath because
// they are in a cold area or it is winter. It should be tied to the outside temperature"). A player breathes visibly
// while Cold Sweat's air temperature at them (trait WORLD, the number on the world gauge: biome, height, time of day,
// season, weather, shade) is below `breathBelowF` (kubejs/config/peacock.json, default 45 °F, about where real
// breath shows). Body temperature, clothing and acclimation play no part; a hearth or boiler that warms the air
// around you does, as indoors it should.
// Cold Sweat sends every player's temperatures to everyone tracking them, so other players' breath follows their own
// air. Not underwater, not for spectators or invisible players. `"coldBreath": false` in peacock.json switches it off.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants.
;(() => {
const CFG = (() => { try { return JsonIO.read('kubejs/config/peacock.json') || {} } catch (e) { return {} } })()
if (CFG.coldBreath === false) return
const BELOW = ((typeof CFG.breathBelowF === 'number' ? CFG.breathBelowF : 45) - 32) / 45   // °F → Cold Sweat units
const EVERY = 60          // ticks from one breath to the next (Subtle Effects' default wait time)
const PUFF = 7            // ticks of each breath that emit a particle
const RANGE_SQ = 48 * 48  // only players this close
const DEG = 3.141592653589793 / 180

const api = (() => {
  try {
    return {
      Temperature: Java.loadClass('com.momosoftworks.coldsweat.api.util.Temperature'),
      Trait: Java.loadClass('com.momosoftworks.coldsweat.api.util.Temperature$Trait'),
      mc: Java.loadClass('net.minecraft.client.Minecraft').getInstance(),
    }
  } catch (e) { console.warn('[peacock] cold breath: Cold Sweat API not found, off: ' + e); return null }
})()
if (!api) return

let breath = null   // the particle type, looked up once the registries are ready
let failed = false

function particle() {
  if (breath || failed) return breath
  try {
    var Registries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
    var RL = Java.loadClass('net.minecraft.resources.ResourceLocation')
    breath = Registries.PARTICLE_TYPE.get(new RL('subtle_effects', 'frosty_breath'))
    if (!breath) { failed = true; console.warn('[peacock] cold breath: subtle_effects:frosty_breath is not registered, off') }
  } catch (e) { failed = true; console.warn('[peacock] cold breath: ' + e) }
  return breath
}

// Game methods by their readable name, falling back to the runtime (SRG) name: on 2026-10-21 KubeJS could not find
// ClientLevel.getGameTime() in Aaron's client ("Cannot find function getGameTime in object ClientLevel") every tick,
// so no breath was ever drawn. The script keeps its own tick count now and goes through call() for the rest.
function call(obj, names, args) {
  for (var i = 0; i < names.length; i++) {
    var f = obj[names[i]]
    if (typeof f === 'function') return f.apply(obj, args || [])
  }
  throw 'no method ' + names[0] + ' on ' + obj
}

let warned = false
function warnOnce(e) {
  if (warned) return
  warned = true
  console.warn('[peacock] cold breath: ' + e + ' (logged once)')
}

function cold(p) {
  return api.Temperature.get(p, api.Trait.WORLD) < BELOW
}

// Subtle Effects' ParticleSpawnUtil.spawnEntityFaceParticle: (0, -0.1, 0.6) in front of the eyes, drifting forward
function puff(level, p, type) {
  var pitch = -call(p, ['getXRot', 'm_146909_']) * DEG, yaw = -call(p, ['getYRot', 'm_146908_']) * DEG
  var cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw)
  // position: x 0, y -0.1, z 0.6 — rotate about X (pitch), then Y (yaw)
  var y1 = -0.1 * cp + 0.6 * sp, z1 = 0.6 * cp + 0.1 * sp
  var x2 = z1 * sy, z2 = z1 * cy
  // speed: x 0, y 0, z 0.005–0.01
  var s = 0.005 + Math.random() * 0.005
  var vy = s * sp, vz1 = s * cp
  var x = call(p, ['getX', 'm_20185_']), y = call(p, ['getEyeY', 'm_20188_']), z = call(p, ['getZ', 'm_20189_'])
  call(level, ['addParticle', 'm_7106_'], [type, x + x2, y + y1, z + z2, vz1 * sy, vy, vz1 * cy])
}

let ticks = 0
ClientEvents.tick(event => {
  ticks++
  try {
    var mc = api.mc
    var level = mc.level, me = mc.player
    if (!level || !me || call(mc, ['isPaused', 'm_91104_'])) return
    var type = particle()
    if (!type) return
    var players = call(level, ['players', 'm_6907_'])
    for (var i = 0; i < players.size(); i++) {
      if ((ticks + i * 17) % EVERY >= PUFF) continue          // each player on their own rhythm
      var p = players.get(i)
      if (call(p, ['isSpectator', 'm_5833_']) || call(p, ['isInvisible', 'm_20145_']) || call(p, ['isUnderWater', 'm_5842_'])) continue
      if (p !== me && call(p, ['distanceToSqr', 'm_20280_'], [me]) > RANGE_SQ) continue
      if (!cold(p)) continue
      puff(level, p, type)
    }
  } catch (e) { warnOnce(e) }
})
})()
