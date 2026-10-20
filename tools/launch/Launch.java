// Peacock pre-launch: sync the pack with packwiz, then apply the hardware profile.
//
// Built into pack/peacock/launch.jar by tools/build-launch.sh (Java 17 bytecode, no dependencies).
// Prism pre-launch command (identical on macOS, Linux, Windows):
//   "$INST_JAVA" -jar "$INST_MC_DIR/peacock/launch.jar" https://raw.githubusercontent.com/Nublys/peacock/main/pack/pack.toml
//
// Profile selection, in order: kubejs/config/peacock-profile.json {"tier":"low"} (written in-game by `/peacock profile <tier>`),
// then the environment variable PEACOCK_PROFILE, then DEFAULT_PROFILE. Tiers: potato | low | medium | high | ultra.
// {"tier":"low","reset":true} re-applies the whole profile once (same as PEACOCK_RESET=1) and clears the flag.
// (default: medium). Set it per instance in Prism: Edit -> Settings -> Environment variables.
//
// A profile folder (peacock/profiles/<name>/) holds *.keys files. "config/oculus.properties.keys"
// patches config/oculus.properties, one setting per line, in the target file's own syntax
// (key=value for .properties and Iris .txt, key = value for TOML, key:value for options.txt).
// Working per setting rather than per file matters because mods rewrite their config files on
// every start, so a file is never byte-identical to anything the pack shipped.
//
// Rules:
//   * packwiz-installer-bootstrap.jar is downloaded if missing, then run; a failed sync aborts the launch
//     (Prism stops when the pre-launch command exits non-zero) -- better than joining with a stale mod set.
//   * A setting is written only if it is missing, or still equal to what a profile last wrote
//     (peacock/.state.properties) -- or, on first adoption when nothing was recorded yet, equal to any
//     shipped profile's value for it. A setting you changed in-game is yours; the profile stops touching it.
//   * PEACOCK_RESET=1 for one launch re-applies the whole profile over your own edits.
//   * PEACOCK_OFFLINE=1 skips the sync (play with what is installed when GitHub/Modrinth are unreachable).
//   * Any non-.keys file in a profile is copied whole with the same three-way rule (by hash).
//
// The jar ships inside the pack and updates itself through packwiz like everything else.

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class Launch {
    static final String BOOTSTRAP = "packwiz-installer-bootstrap.jar";
    static final String BOOTSTRAP_URL =
        "https://github.com/packwiz/packwiz-installer-bootstrap/releases/latest/download/packwiz-installer-bootstrap.jar";
    static final String DEFAULT_PROFILE = "low";
    static final String KEYS = ".keys";

    static Path mcDir, peacockDir, stateFile;
    static Properties state = new Properties();
    static boolean reset = "1".equals(System.getenv("PEACOCK_RESET"));

    public static void main(String[] args) throws Exception {
        if (args.length < 1) { log("usage: java -jar peacock/launch.jar <pack.toml url> [extra packwiz-installer args]"); System.exit(2); }

        Path self = findSelf();                 // <mcDir>/peacock/launch.jar
        peacockDir = self.getParent();
        mcDir = peacockDir.getParent();
        stateFile = peacockDir.resolve(".state.properties");
        if (Files.exists(stateFile)) try (var in = Files.newInputStream(stateFile)) { state.load(in); }

        if ("1".equals(System.getenv("PEACOCK_OFFLINE"))) log("PEACOCK_OFFLINE=1: skipping pack sync"); else syncPack(args);

        String profile = readProfileFile().or(() -> Optional.ofNullable(System.getenv("PEACOCK_PROFILE")).map(String::trim)
            .filter(s -> !s.isEmpty())).orElse(DEFAULT_PROFILE).toLowerCase(Locale.ROOT);
        Path profilesDir = peacockDir.resolve("profiles");
        Path profileDir = profilesDir.resolve(profile);
        if (!Files.isDirectory(profileDir)) {
            log("!! unknown profile '" + profile + "'. Available: " + listProfiles(profilesDir));
            System.exit(1);
        }
        if (reset) log("PEACOCK_RESET=1: re-applying the full profile over local edits");
        applyProfile(profile, profileDir, profilesDir);

        try (var out = Files.newOutputStream(stateFile)) { state.store(out, "peacock profile state (what the profile last wrote)"); }
        // record what is in force (so `/peacock profile` in-game can show it) and clear a one-shot reset flag
        try {
            Path pf = mcDir.resolve("kubejs/config/peacock-profile.json");
            Files.createDirectories(pf.getParent());
            Files.writeString(pf, "{\"tier\":\"" + profile + "\"}\n");
        } catch (IOException e) { log("!! could not record the profile: " + e.getMessage()); }
        log("ready (profile " + profile + ")");
    }

    /** kubejs/config/peacock-profile.json, written by the in-game command: {"tier":"low"} with an optional "reset":true. */
    static Optional<String> readProfileFile() {
        Path f = mcDir.resolve("kubejs/config/peacock-profile.json");
        if (!Files.exists(f)) return Optional.empty();
        try {
            String json = Files.readString(f);
            var m = java.util.regex.Pattern.compile("\"tier\"\\s*:\\s*\"([A-Za-z]+)\"").matcher(json);
            if (java.util.regex.Pattern.compile("\"reset\"\\s*:\\s*true").matcher(json).find()) {
                reset = true; log("profile.json asks for a one-time reset: re-applying the full profile over local edits");
            }
            if (m.find()) { log("profile from kubejs/config/peacock-profile.json: " + m.group(1)); return Optional.of(m.group(1).trim()); }
            log("!! kubejs/config/peacock-profile.json has no \"tier\"; ignoring it");
        } catch (IOException e) {
            log("!! could not read kubejs/config/peacock-profile.json: " + e.getMessage());
        }
        return Optional.empty();
    }

    // ---------------------------------------------------------------- packwiz sync
    static void syncPack(String[] args) throws Exception {
        Path jar = mcDir.resolve(BOOTSTRAP);
        if (!Files.exists(jar)) {
            log("downloading " + BOOTSTRAP);
            HttpClient http = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NORMAL).build();
            HttpResponse<Path> r = http.send(HttpRequest.newBuilder(URI.create(BOOTSTRAP_URL)).build(),
                HttpResponse.BodyHandlers.ofFile(jar));
            if (r.statusCode() != 200) { Files.deleteIfExists(jar); log("!! download failed: HTTP " + r.statusCode()); System.exit(1); }
        }
        String java = Paths.get(System.getProperty("java.home"), "bin",
            System.getProperty("os.name").toLowerCase(Locale.ROOT).contains("win") ? "java.exe" : "java").toString();
        List<String> cmd = new ArrayList<>(List.of(java, "-jar", jar.toString()));
        cmd.addAll(Arrays.asList(args));
        log("syncing pack: " + args[0]);
        int code = new ProcessBuilder(cmd).directory(mcDir.toFile()).inheritIO().start().waitFor();
        if (code != 0) { log("!! packwiz-installer exited with " + code + " -- not launching with a stale pack. (Set PEACOCK_OFFLINE=1 to play with what is installed.)"); System.exit(code); }
    }

    // ---------------------------------------------------------------- profile
    static void applyProfile(String profile, Path profileDir, Path profilesDir) throws IOException {
        List<Path> files;
        try (Stream<Path> s = Files.walk(profileDir)) { files = s.filter(Files::isRegularFile).sorted().collect(Collectors.toList()); }
        int set = 0, kept = 0;
        for (Path src : files) {
            String rel = profileDir.relativize(src).toString().replace('\\', '/');
            int[] r = rel.endsWith(KEYS) ? applyKeys(src, rel.substring(0, rel.length() - KEYS.length()), profilesDir)
                                         : applyWholeFile(src, rel, profilesDir);
            set += r[0]; kept += r[1];
        }
        log("profile " + profile + ": " + set + " setting(s) written, " + kept + " kept as your own");
    }

    /** One setting line: indent, optional quote, key, separator (as written), value, optional trailing comma.
     *  Covers key=value (.properties, Iris .txt), key = value (TOML), key:value (options.txt) and "key": value, (JSON).
     *  A quoted key may contain spaces ("Show Water Effect" = 3, as Cold Sweat writes its TOML). */
    static final Pattern LINE = Pattern.compile("^(\\s*)(\"?)((?<=\")[A-Za-z0-9_.\\- ]+|[A-Za-z0-9_.\\-]+)\\2(\\s*[=:]\\s*)(.*?)(,?)\\s*$");

    /** A TOML table header, [walking] or [general.advancedSettings] (not [[array tables]]). */
    static final Pattern HEADER = Pattern.compile("^\\s*\\[\\s*([A-Za-z0-9_.\\-]+)\\s*\\]\\s*(#.*)?$");

    /** Lines as { key, separator, value, section }. A [table] line in a .keys file scopes the keys after it to that
     *  table of the target TOML (Camera Overhaul repeats the same keys under [walking], [sprinting], [flying] ...);
     *  keys before any header keep the old rule: the first line with that key anywhere in the file. */
    static List<String[]> parseKeys(Path f) throws IOException {
        List<String[]> out = new ArrayList<>();
        String section = "";
        for (String line : Files.readAllLines(f, StandardCharsets.UTF_8)) {
            if (line.isBlank() || line.trim().startsWith("#")) continue;
            Matcher h = HEADER.matcher(line);
            if (h.matches()) { section = h.group(1); continue; }
            Matcher m = LINE.matcher(line);
            if (m.matches()) out.add(new String[] { m.group(3), m.group(4), m.group(5), section });
        }
        return out;
    }

    static String qualified(String[] kv) { return kv[3].isEmpty() ? kv[0] : kv[3] + "." + kv[0]; }

    /** Every value any profile assigns to (target, key) counts as "not the player's own". */
    static Map<String, Set<String>> profileValues(Path profilesDir, String keysRel) throws IOException {
        Map<String, Set<String>> all = new HashMap<>();
        try (Stream<Path> s = Files.list(profilesDir)) {
            for (Path p : s.filter(Files::isDirectory).collect(Collectors.toList())) {
                Path f = p.resolve(keysRel);
                if (Files.isRegularFile(f)) for (String[] kv : parseKeys(f)) all.computeIfAbsent(qualified(kv), x -> new HashSet<>()).add(kv[2]);
            }
        }
        return all;
    }

    static int[] applyKeys(Path keysFile, String targetRel, Path profilesDir) throws IOException {
        Path target = mcDir.resolve(targetRel);
        List<String[]> want = parseKeys(keysFile);
        Map<String, Set<String>> anyProfile = profileValues(profilesDir, targetRel + KEYS);
        boolean exists = Files.exists(target);
        if (!exists && targetRel.endsWith(".toml")) { log("skip  " + targetRel + " (not present yet; the mod creates it, keys apply next launch)"); return new int[] {0, 0}; }
        if (!exists && targetRel.equals("options.txt")) { log("skip  options.txt (first launch; Default Options creates it, keys apply next launch)"); return new int[] {0, 0}; }
        List<String> lines = exists ? new ArrayList<>(Files.readAllLines(target, StandardCharsets.UTF_8)) : new ArrayList<>();
        int set = 0, kept = 0;
        List<String> changed = new ArrayList<>();
        for (String[] kv : want) {
            String key = kv[0], sep = kv[1], value = kv[2], section = kv[3], qkey = qualified(kv);
            String stateKey = "key." + targetRel + "#" + qkey;
            int idx = -1; Matcher found = null;
            String table = "";
            int sectionEnd = -1;            // last setting line of the wanted table, where a missing key is inserted
            for (int i = 0; i < lines.size(); i++) {
                Matcher h = HEADER.matcher(lines.get(i));
                if (h.matches()) { table = h.group(1); if (table.equals(section) && sectionEnd < 0) sectionEnd = i; continue; }
                if (!section.isEmpty() && !table.equals(section)) continue;
                Matcher m = LINE.matcher(lines.get(i));
                if (m.matches()) {
                    if (!section.isEmpty()) sectionEnd = i;
                    if (m.group(3).equals(key)) { idx = i; found = m; break; }
                }
            }
            if (idx < 0) {
                String line = (key.contains(" ") ? "\"" + key + "\"" : key) + sep + value;   // a key with spaces must stay quoted
                int firstHeader = -1;
                if (section.isEmpty()) for (int i = 0; i < lines.size() && firstHeader < 0; i++) if (HEADER.matcher(lines.get(i)).matches()) firstHeader = i;
                if (section.isEmpty() && firstHeader < 0) lines.add(line);
                else if (section.isEmpty()) lines.add(firstHeader, line);   // top level of a TOML: before its first [table]
                else if (sectionEnd >= 0) lines.add(sectionEnd + 1, line);
                else { lines.add(""); lines.add("[" + section + "]"); lines.add(line); }
                state.setProperty(stateKey, value); set++; changed.add(qkey); continue;
            }
            String cur = found.group(5);
            if (same(cur, value)) { state.setProperty(stateKey, value); continue; }
            String last = state.getProperty(stateKey);
            // Known to us: untouched only if still what we last wrote. Never seen: untouched if it is any profile's value.
            boolean untouched = reset || (last != null ? same(cur, last) : anyProfile.getOrDefault(qkey, Set.of()).stream().anyMatch(v -> same(cur, v)));
            if (!untouched) { kept++; continue; }
            lines.set(idx, found.group(1) + found.group(2) + key + found.group(2) + found.group(4) + value + found.group(6));   // keep indent, quoting, spacing, trailing comma
            state.setProperty(stateKey, value); set++; changed.add(qkey);
        }
        if (!changed.isEmpty()) {
            Files.createDirectories(target.getParent());
            Files.write(target, lines, StandardCharsets.UTF_8);
            log("set   " + targetRel + ": " + String.join(", ", changed));
        }
        if (kept > 0) log("keep  " + targetRel + ": " + kept + " setting(s) you changed (PEACOCK_RESET=1 to overwrite)");
        return new int[] {set, kept};
    }

    static int[] applyWholeFile(Path src, String rel, Path profilesDir) throws IOException {
        Path dst = mcDir.resolve(rel);
        String want = sha256(Files.readAllBytes(src)), key = "file." + rel;
        if (Files.exists(dst)) {
            String have = sha256(Files.readAllBytes(dst));
            if (have.equals(want)) { state.setProperty(key, have); return new int[] {0, 0}; }
            boolean untouched = reset || have.equals(state.getProperty(key)) || anyProfileHas(profilesDir, rel, have);
            if (!untouched) { log("keep  " + rel + " (edited by you; PEACOCK_RESET=1 to overwrite)"); return new int[] {0, 1}; }
        }
        Files.createDirectories(dst.getParent());
        Files.copy(src, dst, StandardCopyOption.REPLACE_EXISTING);
        state.setProperty(key, want);
        log("write " + rel);
        return new int[] {1, 0};
    }

    static boolean anyProfileHas(Path profilesDir, String rel, String hash) throws IOException {
        try (Stream<Path> s = Files.list(profilesDir)) {
            for (Path p : s.filter(Files::isDirectory).collect(Collectors.toList())) {
                Path f = p.resolve(rel);
                if (Files.isRegularFile(f) && sha256(Files.readAllBytes(f)).equals(hash)) return true;
            }
        }
        return false;
    }

    // ---------------------------------------------------------------- util
    static Path findSelf() throws Exception {
        Path p = Paths.get(Launch.class.getProtectionDomain().getCodeSource().getLocation().toURI()).toAbsolutePath().normalize();
        if (Files.isRegularFile(p)) return p;
        throw new IllegalStateException("cannot locate peacock/launch.jar - run it with -jar by its full path");
    }

    static String listProfiles(Path dir) throws IOException {
        try (Stream<Path> s = Files.list(dir)) { return s.filter(Files::isDirectory).map(p -> p.getFileName().toString()).sorted().collect(Collectors.joining(", ")); }
    }

    /** Equal as text, or as numbers (mods rewrite 64 as 64.0, 0.75 as 0.750). */
    static boolean same(String a, String b) {
        if (a.equals(b)) return true;
        try { return Double.parseDouble(a) == Double.parseDouble(b); } catch (NumberFormatException e) { return false; }
    }

    static String sha256(byte[] b) throws IOException {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(b)); }
        catch (Exception e) { throw new IOException(e); }
    }

    static void log(String s) { System.out.println("[peacock] " + s); }
}
