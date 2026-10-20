#!/usr/bin/env python3
"""Bake a hardware profile into a copy of the pack (for launchers with no pre-launch hook).

Prism and the Modrinth App run peacock/launch.jar before each launch, which applies the player's profile
over the shipped defaults. The CurseForge app cannot, so the release workflow exports one CurseForge zip
per tier with that tier's *.keys already written into the shipped config files. This is the same
per-setting rule as Launch.java (indent, quoting, separator and trailing comma are kept), with two
differences: options.txt keys go to config/defaultoptions/options.txt (Default Options copies it on first
launch), and files that do not exist yet are created with the keys alone (.properties and Iris .txt).

Usage: python3 tools/apply-profile.py <tier> <pack dir>
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

# a quoted key may contain spaces ("Show Water Effect" = 3, as Cold Sweat writes its TOML)
LINE = re.compile(r'^(\s*)("?)((?<=")[A-Za-z0-9_.\- ]+|[A-Za-z0-9_.\-]+)\2(\s*[=:]\s*)(.*?)(,?)\s*$')
# a TOML [table] line; in a .keys file it scopes the keys after it to that table (Camera Overhaul repeats keys per movement)
HEADER = re.compile(r'^\s*\[\s*([A-Za-z0-9_.\-]+)\s*\]\s*(#.*)?$')
TARGET_OVERRIDE = {"options.txt": "config/defaultoptions/options.txt"}


def parse_keys(f: Path):
    out, section = [], ""
    for line in f.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.strip().startswith("#"):
            continue
        h = HEADER.match(line)
        if h:
            section = h.group(1)
            continue
        m = LINE.match(line)
        if m:
            out.append((m.group(3), m.group(4), m.group(5), section))
    return out


def apply(keys_file: Path, target: Path) -> int:
    want = parse_keys(keys_file)
    lines = target.read_text(encoding="utf-8").splitlines() if target.exists() else []
    is_json = target.suffix == ".json"
    changed = 0
    for key, sep, value, section in want:
        bare = f'"{key}"' if " " in key else key   # how a new line spells the key
        table, section_end, first_header = "", -1, -1
        for i, line in enumerate(lines):
            h = HEADER.match(line)
            if h:
                table = h.group(1)
                if first_header < 0:
                    first_header = i
                if table == section and section_end < 0:
                    section_end = i
                continue
            if section and table != section:
                continue
            m = LINE.match(line)
            if m and section:
                section_end = i
            if m and m.group(3) == key:
                new = f"{m.group(1)}{m.group(2)}{key}{m.group(2)}{m.group(4)}{value}{m.group(6)}"
                if new != line:
                    lines[i] = new
                    changed += 1
                break
        else:
            if target.suffix == ".toml" and target.exists():
                print(f"  !! {target.name}: no line for {key}; TOML keys live in sections, not adding", file=sys.stderr)
                continue
            if is_json:
                # insert before the closing brace, with a comma on the previous entry
                close = max(i for i, l in enumerate(lines) if l.strip() == "}") if lines else -1
                if close < 0:
                    lines = ["{", f'  "{key}": {value}', "}"]
                else:
                    prev = close - 1
                    if prev >= 0 and lines[prev].strip() and not lines[prev].rstrip().endswith((",", "{")):
                        lines[prev] = lines[prev].rstrip() + ","
                    lines.insert(close, f'  "{key}"{sep}{value}')
            elif section and section_end >= 0:
                lines.insert(section_end + 1, f"{bare}{sep}{value}")
            elif section:
                lines += ([""] if lines else []) + [f"[{section}]", f"{bare}{sep}{value}"]
            elif first_header >= 0:
                lines.insert(first_header, f"{bare}{sep}{value}")
            else:
                lines.append(f"{bare}{sep}{value}")
            changed += 1
    if changed or not target.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return changed


def main() -> None:
    tier, pack = sys.argv[1], Path(sys.argv[2])
    prof = pack / "peacock/profiles" / tier
    if not prof.is_dir():
        sys.exit(f"no such profile: {tier} (have: {', '.join(p.name for p in (pack / 'peacock/profiles').iterdir() if p.is_dir() and not p.name.startswith('_'))})")
    total = 0
    for keys in sorted(prof.rglob("*.keys")):
        rel = keys.relative_to(prof).as_posix()[: -len(".keys")]
        rel = TARGET_OVERRIDE.get(rel, rel)
        n = apply(keys, pack / rel)
        total += n
        print(f"  {rel}: {n} setting(s)")
    print(f"profile {tier} baked into {pack}: {total} settings")


if __name__ == "__main__":
    main()
