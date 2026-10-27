# Peacock override (2026-10-23) of Incendium 5.3.5's every-tick clock. The three mob scans below looked at every mob
# in every dimension each tick (villagers, cows, all of them: about 3.6% of the server tick in spark) although
# everything they do is Nether-only (Nether biomes and structures). `in minecraft:the_nether` with `distance=0..`
# keeps them to the Nether. The projectile, item and frost lines stay as Incendium wrote them, so its weapons
# behave the same everywhere. Re-check this copy when Incendium is updated.
# 2026-10-27: the two shield lines scanned every entity in every dimension (no type filter) four times a tick for
# in.cd_shield, a score Incendium only ever sets on players (player/main); they now look at players only.
# clock: 1t

schedule function incendium:clocks/main 1t replace

function incendium:technical/main
execute as @a at @s run function incendium:player/main
function incendium:castle/main

# mob init
execute in minecraft:the_nether as @e[type=#incendium:mobs_no_player, tag=!in.checked, distance=0..] at @s run function incendium:entity/mob/init

execute in minecraft:the_nether as @e[type=#incendium:mobs_no_player, distance=0..] unless score @s in.eid matches 0..32767 run function incendium:technical/entity_id/check
execute in minecraft:the_nether as @e[type=#incendium:mobs_no_player, tag=in.ticking_entity, distance=0..] at @s run function incendium:entity/mob/main

scoreboard players remove @e[type=#incendium:mobs,scores={in.frozen=1..}] in.frozen 1
execute at @e[type=#incendium:mobs,scores={in.frozen=1..},predicate=incendium:random/10] run particle minecraft:snowflake ~ ~1.6 ~ 0.1 0.05 0.1 .1 5 force

# other
execute as @e[type=#incendium:other, tag=!in.checked] at @s run function incendium:entity/other/init

execute as @e[type=#incendium:other, tag=in.ticking_entity] at @s run function incendium:entity/other/main

execute if entity @a[tag=nbs_borderofli] run function incendium:border_of_life/tick

# shield cloud effect clear
execute if entity @a[scores={in.cd_shield=1..},predicate=incendium:holding/radiation_shield] run effect clear @a[scores={in.cd_shield=1..},predicate=incendium:holding/radiation_shield] poison

execute if entity @a[scores={in.cd_shield=1..},predicate=incendium:holding/necrotic_shield] run effect clear @a[scores={in.cd_shield=1..},predicate=incendium:holding/necrotic_shield] wither
