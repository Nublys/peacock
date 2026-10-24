// Peacock — hide Village Recruits: Village Expansion's mod-detection report on join (client only, 2026-10-23).
//
// Every login printed about a dozen chat lines like "[VillageRecruits Addon] SiegeWeapons NOT found → Siege Engineer
// DISABLED" and "Integrity check passed", to every player, every time (seen in a client log, 2026-10-23). The addon has
// no setting for it (ExtraClassesStatusMessage / ModIntegrityStatusMessage send unconditionally), so the client drops
// those system messages as they arrive. Lines that report a real problem (a WARNING, something missing, something
// that could not be resolved) still show. Nothing else in chat is touched.
//
// Rhino notes (see tools/validate.py): `var` inside functions.
;(() => {
if (!Platform.isClientEnvironment()) return
const PREFIX = '[VillageRecruits Addon]'
const PROBLEM = /WARNING|missing|MISSING|could NOT|NOT readable/
// known and chosen, not a problem: the Recruits aircraft compat is left out on purpose (docs/DECISIONS.md, 2026-10-24)
const EXPECTED = /immersiveaircraftscompat/

ForgeEvents.onEvent('net.minecraftforge.client.event.ClientChatReceivedEvent$System', event => {
  try {
    var text = String(event.getMessage().getString())
    if (text.indexOf(PREFIX) !== 0 || (PROBLEM.test(text) && !EXPECTED.test(text))) return
    event.setCanceled(true)
  } catch (e) { }
})
})()
