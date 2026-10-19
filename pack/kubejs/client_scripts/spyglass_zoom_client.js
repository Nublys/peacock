// Peacock — Just Zoom only while you carry a spyglass (client half; the server half is server_scripts/spyglass_zoom.js).
//
// The server says whether this player carries a spyglass anywhere (inventory or backpack). Without one, Just Zoom's
// zoom key is unbound so it cannot be pressed; with one, it is put back. The player's own choice of key is kept in
// kubejs/config/peacock-zoom.json, so an options save while unbound never loses it (Z, Just Zoom's default, otherwise).
// Until the server answers (or on a server without the pack), the key stays as the player left it.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks.
;(() => {
const FILE = 'kubejs/config/peacock-zoom.json'

function zoomKey() {
  try { return Java.loadClass('de.keksuccino.justzoom.KeyMappings').KEY_TOGGLE_ZOOM } catch (e) { return null }
}

function remembered() {
  try { var d = JsonIO.read(FILE); return d && d.key ? String(d.key) : null } catch (e) { return null }
}

function remember(name) {
  try { JsonIO.write(FILE, { key: name }) } catch (e) { }
}

function apply(has) {
  var key = zoomKey()
  if (!key) return
  try {
    var InputConstants = Java.loadClass('com.mojang.blaze3d.platform.InputConstants')
    var KeyMapping = Java.loadClass('net.minecraft.client.KeyMapping')
    var current = key.getKey()
    var unbound = current.equals(InputConstants.UNKNOWN)
    if (!has) {
      if (unbound) return
      remember(String(current.getName()))
      key.setKey(InputConstants.UNKNOWN)
      key.setDown(false)
      KeyMapping.resetMapping()
    } else {
      if (!unbound) { remember(String(current.getName())); return }
      var name = remembered()
      var restore = name ? InputConstants.getKey(name) : key.getDefaultKey()
      if (restore.equals(InputConstants.UNKNOWN)) restore = key.getDefaultKey()
      key.setKey(restore)
      KeyMapping.resetMapping()
    }
  } catch (e) { console.warn('[peacock] zoom key: ' + e) }
}

NetworkEvents.dataReceived('peacock:zoom', event => { apply(event.data.getBoolean('spyglass')) })
})()
