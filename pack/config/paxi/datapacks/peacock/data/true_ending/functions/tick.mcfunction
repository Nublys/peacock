# Peacock (2026-10-30): True Ending's tick, with every bare @e scan kept to the End (positioned at the main island,
# 1024 blocks): unbounded, each searched every loaded entity in every dimension every tick, as Incendium's did
# (DECISIONS 2026-10-24). The dragon, its markers, phantoms and decoys only exist in the End. Otherwise True Ending 1.1.0c's own.






# COUNTERS AND CLOCKS

scoreboard players add 1min trueEnding_count 1

scoreboard players add 20tick trueEnding_count 1

scoreboard players add 10tick trueEnding_count 1

scoreboard players add 2tick trueEnding_count 1

scoreboard players add 5tick trueEnding_count 1

execute if score 20tick trueEnding_count matches 20.. run function true_ending:clocks/20tick

execute if score 2tick trueEnding_count matches 2.. run function true_ending:clocks/2tick

execute if score 10tick trueEnding_count matches 10.. run function true_ending:clocks/10tick

execute if score 5tick trueEnding_count matches 5.. run function true_ending:clocks/5tick

execute if score 1min trueEnding_count matches 1200.. run function true_ending:clocks/1min

#ambience
execute in the_end positioned 0 80 0 if entity @p[distance=..128] if entity @e[type=ender_dragon,distance=..256] run function true_ending:ambience/a_main

#dragon
execute in minecraft:the_end positioned 0 80 0 as @e[type=ender_dragon,tag=!trueEnding_dragon_particlechecked,tag=!trueEnding_mirrordragon,tag=!trueEnding_dragon_noAI,distance=..1024] at @s if data entity @s DragonPhase run function true_ending:boss/dragon_entity_spawn
execute in minecraft:the_end positioned 0 80 0 as @e[type=ender_dragon,tag=!trueEnding_mirrordragon,tag=!trueEnding_dragon_noAI,distance=..1024] at @s run function true_ending:boss/a_main

#xp
execute in the_end positioned 0 90 0 as @e[distance=..24,type=experience_orb] run function true_ending:other/xp

######################################################################################################

execute in minecraft:the_end positioned 0 80 0 as @e[type=marker,tag=trueEnding_dragonparticle,distance=..1024] at @s run function true_ending:ambience/dragon_entity
execute in minecraft:the_end positioned 0 80 0 as @e[type=marker,tag=trueEnding_ultrafireball,distance=..1024] at @s run function true_ending:boss/ultra_fireball
execute in minecraft:the_end positioned 0 80 0 as @e[type=marker,tag=trueEnding_shockwave,distance=..1024] at @s run function true_ending:boss/shockwave/root
execute in minecraft:the_end positioned 0 80 0 as @e[type=marker,tag=trueEnding_shockwave2,distance=..1024] at @s run function true_ending:boss/shockwave/root2
execute in minecraft:the_end positioned 0 80 0 as @e[type=marker,tag=trueEnding_pad,distance=..1024] at @s run function true_ending:boss/shockwave/pad

execute in minecraft:the_end positioned 0 80 0 as @e[type=phantom,tag=trueEnding_guardphantom,distance=..1024] at @s run function true_ending:boss/phantom/entity

execute in minecraft:the_end positioned 0 80 0 as @e[type=ender_dragon,tag=trueEnding_mirrordragon,distance=..1024] at @s run function true_ending:boss/dive/decoy_enderdragon

######################################################################################################

#new dragon fireball
execute in the_end positioned 0 80 0 as @e[type=dragon_fireball,distance=..256] at @s run function true_ending:boss/summon_ultra_fireball

#respawn animation
execute if score respawn_ender_dragon trueEnding_storage matches 0.. in the_end positioned 0 65 0 unless entity @e[type=end_crystal,distance=..16,nbt={BeamTarget:{}}] run scoreboard players reset respawn_ender_dragon trueEnding_storage
execute unless score respawn_ender_dragon trueEnding_storage matches 0.. in the_end positioned 0 65 0 if entity @e[type=end_crystal,distance=..16,nbt={BeamTarget:{}}] run scoreboard players add respawn_ender_dragon trueEnding_storage 0
execute if score respawn_ender_dragon trueEnding_storage matches 0.. in the_end positioned 0 65 0 if entity @p[distance=..128] run function true_ending:respawning/a_main

#player
execute as @a[scores={trueEnding_settings.dragonhealth=-2147483648..2147483647}] at @s run function true_ending:settings/set_value_dragonhealth

#music
execute as @a[scores={trueEnding_music=0..}] at @s run function true_ending:music

execute in the_end positioned 0 80 0 as @e[type=marker,tag=trueEnding_endspike,tag=!trueEnding_endspike_caged,distance=..128] at @s if loaded ~ ~ ~ run function true_ending:boss/phantom/summon
execute in the_end positioned 0 80 0 as @e[type=marker,tag=trueEnding_exitportal,distance=..128] at @s run function true_ending:ambience/exitportal