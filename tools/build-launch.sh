#!/bin/sh
# Builds pack/peacock/launch.jar from tools/launch/Launch.java (Java 17 bytecode; any JDK ≥ 17).
set -e
cd "$(dirname "$0")/.."
rm -rf build/launch && mkdir -p build/launch
javac --release 17 -Xlint:all -d build/launch tools/launch/Launch.java
printf 'Main-Class: Launch\n' > build/launch/MANIFEST.MF
# fixed timestamps so the jar is reproducible across builds of the same source
find build/launch -exec touch -t 202001010000 {} +
jar --create --file pack/peacock/launch.jar --manifest build/launch/MANIFEST.MF --date=2020-01-01T00:00:00Z -C build/launch Launch.class
ls -l pack/peacock/launch.jar
# the importable Prism instance carries a copy of the jar
python3 tools/build-instance.py
