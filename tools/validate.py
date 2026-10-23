#!/usr/bin/env python3
"""Validate the pack: every TOML/JSON parses, every .pw.toml is well-formed,
filenames are unique, and the packwiz index matches the files on disk.

Run from the repo root:  python3 tools/validate.py
Exit code 1 on any failure. Used by CI and before every PR.
"""
import hashlib
import json
import re
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACK = ROOT / "pack"
errors: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)
    print(f"  ERROR  {msg}")


def parse_all() -> None:
    for p in sorted(PACK.rglob("*")):
        if p.is_dir():
            continue
        rel = p.relative_to(PACK)
        try:
            if p.suffix == ".toml":
                with open(p, "rb") as f:
                    tomllib.load(f)
            elif p.suffix in (".json", ".mcmeta"):
                txt = p.read_text(encoding="utf-8")
                try:
                    json.loads(txt)
                except json.JSONDecodeError:
                    # several mods write JSON with // comments; strip and retry
                    stripped = re.sub(r"^\s*//.*$", "", txt, flags=re.M)
                    stripped = re.sub(r",(\s*[}\]])", r"\1", stripped)
                    json.loads(stripped)
            elif p.suffix == ".json5":
                pass  # json5 (comments) — skipped; mods validate these at load
        except Exception as e:  # noqa: BLE001
            err(f"{rel}: {type(e).__name__}: {e}")


def check_pw_tomls() -> None:
    seen_files: dict[str, str] = {}
    for p in sorted(PACK.rglob("*.pw.toml")):
        rel = str(p.relative_to(PACK))
        with open(p, "rb") as f:
            d = tomllib.load(f)
        for k in ("name", "filename", "side", "download"):
            if k not in d:
                err(f"{rel}: missing '{k}'")
        if d.get("side") not in ("client", "server", "both"):
            err(f"{rel}: bad side {d.get('side')!r}")
        dl = d.get("download", {})
        mode = dl.get("mode", "url")
        if mode == "url" and not dl.get("url"):
            err(f"{rel}: download.mode=url but no url")
        if not dl.get("hash") or not dl.get("hash-format"):
            err(f"{rel}: missing download hash")
        if "update" not in d:
            err(f"{rel}: no [update] source — cannot be updated by packwiz")
        fn = d.get("filename", "")
        if " " in fn:
            err(f"{rel}: filename contains a space: {fn!r}")
        # Multi-version jars whose mods.toml declares a range that includes 1.20.1 (checked by hand):
        MULTI_VERSION_OK = {"immediatelyfast"}   # ImmediatelyFast-Forge-1.5.5+1.20.4: minecraft [1.20,1.20.4]
        if (re.search(r"\+1\.20\.[2-9]", fn) or re.search(r"1\.21", fn)) and p.stem.removesuffix(".pw") not in MULTI_VERSION_OK:
            err(f"{rel}: filename looks like a non-1.20.1 build: {fn}")
        if fn in seen_files:
            err(f"{rel}: duplicate filename {fn} (also {seen_files[fn]})")
        seen_files[fn] = rel


def check_index() -> None:
    idx_path = PACK / "index.toml"
    with open(idx_path, "rb") as f:
        idx = tomllib.load(f)
    fmt = idx.get("hash-format", "sha256")
    indexed = {e["file"]: e for e in idx.get("files", [])}
    on_disk = {
        str(p.relative_to(PACK))
        for p in PACK.rglob("*")
        if p.is_file() and p.name not in ("index.toml", "pack.toml")
    }
    for f in sorted(on_disk - set(indexed)):
        err(f"index: {f} exists but is not indexed (run `packwiz refresh`)")
    for f in sorted(set(indexed) - on_disk):
        err(f"index: {f} is indexed but missing on disk")
    for f, e in indexed.items():
        p = PACK / f
        if not p.exists():
            continue
        h = hashlib.new(e.get("hash-format", fmt), p.read_bytes()).hexdigest()
        if h != e["hash"]:
            err(f"index: hash mismatch for {f} (run `packwiz refresh`)")
    # pack.toml must reference the current index hash
    with open(PACK / "pack.toml", "rb") as f:
        pack = tomllib.load(f)
    idx_hash = hashlib.sha256(idx_path.read_bytes()).hexdigest()
    if pack["index"]["hash"] != idx_hash:
        err("pack.toml index hash is stale (run `packwiz refresh`)")


def check_kubejs() -> None:
    """KubeJS 2001's Rhino (rhino-forge 2001.2.3) traps that have each cost a test world, checked by hand-run harness:
    Math.PI / Math.E / … are undefined (NaN arithmetic, no error); a `const`/`let` inside a try block throws
    "redeclaration of var" at run time. Inside functions use `var` (and a literal for pi)."""
    import re
    for f in sorted((PACK / "kubejs").rglob("*.js")):
        code = [re.sub(r"//.*", "", l) for l in f.read_text(encoding="utf-8").splitlines()]
        for i, line in enumerate(code, 1):
            m = re.search(r"\bMath\.([A-Z][A-Z0-9_]*)\b", line)
            if m:
                err(f"{f.relative_to(ROOT)}:{i}: Math.{m.group(1)} is undefined in KubeJS' Rhino; use a literal")
        depth_try = []
        depth = 0
        for i, line in enumerate(code, 1):
            if re.search(r"\btry\s*\{", line):
                depth_try.append(depth + line[: line.index("try")].count("{") - line[: line.index("try")].count("}") + 1)
            if depth_try and re.match(r"\s*(const|let)\s", line) and depth >= depth_try[-1]:
                err(f"{f.relative_to(ROOT)}:{i}: const/let inside a try block throws 'redeclaration of var' in KubeJS' Rhino; use var")
            depth += line.count("{") - line.count("}")
            while depth_try and depth < depth_try[-1]:
                depth_try.pop()
        # `for (var d ...)` is scoped to its loop in this Rhino: a later `for (d = ...)` without its own declaration
        # throws "Assignment to undeclared variable d" (capital_boards.js, 2026-10-21, a half-built pavilion)
        text = "\n".join(code)
        declared = set()
        for m in re.finditer(r"^\s*(?:var|let|const)\s+(.+)$", text, re.M):
            for part in m.group(1).split(","):
                n = re.match(r"\s*([A-Za-z_$][\w$]*)", part)
                if n: declared.add(n.group(1))
        for m in re.finditer(r"\bfunction\s*[\w$]*\s*\(([^)]*)\)|\(([^()]*)\)\s*=>|\b([A-Za-z_$][\w$]*)\s*=>", text):
            for g in m.groups():
                if g: declared.update(x.strip() for x in g.split(",") if x.strip())
        for i, line in enumerate(code, 1):
            for m in re.finditer(r"\bfor\s*\(\s*([A-Za-z_$][\w$]*)\s*=", line):
                if m.group(1) not in declared:
                    err(f"{f.relative_to(ROOT)}:{i}: for ({m.group(1)} = …) reuses a loop variable only declared in an earlier for (var …); KubeJS' Rhino scopes that to its loop — declare it with var before the loops")
        # event.cancel() / success() / exit() throw to end the handler at once (KubeJS 6 EventExit), so nothing after
        # one in the same block ever runs (capital_npcs.js, 2026-10-23: the service people's menus never opened)
        for i, line in enumerate(code, 1):
            m = re.search(r"\bevent\.(cancel|success|exit)\([^)]*\)\s*;?\s*(.*)$", line)
            if not m: continue
            rest = m.group(2).strip()
            if not rest:
                nxt = next((l.strip() for l in code[i:] if l.strip()), "")
                rest = nxt
            if rest and not re.match(r"(\}|return\b)", rest):
                err(f"{f.relative_to(ROOT)}:{i}: event.{m.group(1)}() ends the handler at once in KubeJS 6; move it to the end (the code after it never runs)")


def check_advancements() -> None:
    """Every boss achievements.js grants must exist in the generated advancement tree (tools/gen-advancements.py)."""
    import re
    js = PACK / "kubejs/server_scripts/achievements.js"
    adv = PACK / "config/paxi/datapacks/peacock/data/peacock/advancements"
    if not js.exists():
        return
    for bid in re.findall(r"^  '[^']+': \['([a-z_]+)', (?:true|false)\],", js.read_text(encoding="utf-8"), re.M):
        if not (adv / "bosses" / f"{bid}.json").exists():
            err(f"achievements.js grants peacock:bosses/{bid} but there is no such advancement (run tools/gen-advancements.py)")


def check_datapack_overlap() -> None:
    """The pack datapack (folder) loads AFTER peacock-ruins.zip, so any file both define is taken from the folder.
    A stale minecraft:village set in the folder silently replaced every ruin with a living CTOV village until
    2026-10-19. Only pack.mcmeta may appear in both."""
    import os, zipfile
    zp = PACK / "config/paxi/datapacks/peacock-ruins.zip"
    folder = PACK / "config/paxi/datapacks/peacock"
    if not zp.exists() or not folder.exists():
        return
    zn = {n for n in zipfile.ZipFile(zp).namelist() if not n.endswith("/")}
    fn = {str(p.relative_to(folder)).replace(os.sep, "/") for p in folder.rglob("*") if p.is_file()}
    for f in sorted((zn & fn) - {"pack.mcmeta"}):
        err(f"datapack overlap: {f} is in both peacock-ruins.zip and the peacock folder (the folder wins)")


def main() -> int:
    print("parsing TOML/JSON …"); parse_all()
    print("checking .pw.toml entries …"); check_pw_tomls()
    print("checking index …"); check_index()
    print("checking KubeJS scripts for Rhino traps …"); check_kubejs()
    print("checking achievements …"); check_advancements()
    print("checking datapack overlap …"); check_datapack_overlap()
    n_mods = len(list((PACK / "mods").glob("*.pw.toml")))
    if errors:
        print(f"\n{len(errors)} problem(s).")
        return 1
    print(f"\nOK — {n_mods} mods, index consistent.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
