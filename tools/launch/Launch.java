// Peacock pre-launch: sync the pack with packwiz, then apply the hardware profile.
//
// Built into pack/peacock/launch.jar by tools/build-launch.sh (Java 17 bytecode, no dependencies).
// Prism pre-launch command (identical on macOS, Linux, Windows):
//   "$INST_JAVA" -jar "$INST_MC_DIR/peacock/launch.jar" https://raw.githubusercontent.com/Nublys/peacock/main/pack/pack.toml
//
// Profile selection: environment variable PEACOCK_PROFILE = potato | low | medium | high | ultra
// (default: medium). Set it per instance in Prism: Edit → Settings → Environment variables.
//
// Rules:
//   • packwiz-installer-bootstrap.jar is downloaded if missing, then run; a failed sync aborts the launch
//     (Prism stops when the pre-launch command exits non-zero) — better than joining with a stale mod set.
//   • A profile file is written only if the target is missing, or still equal to what a profile last
//     wrote (hash in peacock/.state.properties), or equal to any shipped profile's copy. A file you have
//     changed in-game is yours; the profile stops touching it. Same rule per key for options.txt.
//   • PEACOCK_RESET=1 for one launch re-applies the whole profile over your own edits.
//   • PEACOCK_OFFLINE=1 skips the sync (play with what is installed when GitHub/Modrinth are unreachable).
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
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class Launch {
    static final String BOOTSTRAP = "packwiz-installer-bootstrap.jar";
    static final String BOOTSTRAP_URL =
        "https://github.com/packwiz/packwiz-installer-bootstrap/releases/latest/download/packwiz-installer-bootstrap.jar";
    static final String DEFAULT_PROFILE = "medium";

    static Path mcDir, peacockDir, stateFile;
    static Properties state = new Properties();
    static boolean reset = "1".equals(System.getenv("PEACOCK_RESET"));

    public static void main(String[] args) throws Exception {
        if (args.length < 1) { log("usage: java -jar peacock/launch.jar <pack.toml url> [extra packwiz-installer args]"); System.exit(2); }

        // Locate ourselves: <mcDir>/peacock/launch.jar
        Path self = findSelf();
        peacockDir = self.getParent();
        mcDir = peacockDir.getParent();
        stateFile = peacockDir.resolve(".state.properties");
        if (Files.exists(stateFile)) try (var in = Files.newInputStream(stateFile)) { state.load(in); }

        if ("1".equals(System.getenv("PEACOCK_OFFLINE"))) log("PEACOCK_OFFLINE=1: skipping pack sync"); else syncPack(args);

        String profile = Optional.ofNullable(System.getenv("PEACOCK_PROFILE")).map(String::trim)
            .filter(s -> !s.isEmpty()).orElse(DEFAULT_PROFILE).toLowerCase(Locale.ROOT);
        Path profilesDir = peacockDir.resolve("profiles");
        Path profileDir = profilesDir.resolve(profile);
        if (!Files.isDirectory(profileDir)) {
            log("!! unknown PEACOCK_PROFILE '" + profile + "'. Available: " + listProfiles(profilesDir));
            System.exit(1);
        }
        if (reset) log("PEACOCK_RESET=1: re-applying the full profile over local edits");
        applyProfile(profile, profileDir, profilesDir);

        try (var out = Files.newOutputStream(stateFile)) { state.store(out, "peacock profile state (what the profile last wrote)"); }
        log("ready (profile " + profile + ")");
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

    // ---------------------------------------------------------------- profile files
    static void applyProfile(String profile, Path profileDir, Path profilesDir) throws IOException {
        List<Path> files;
        try (Stream<Path> s = Files.walk(profileDir)) { files = s.filter(Files::isRegularFile).collect(Collectors.toList()); }
        int written = 0, kept = 0;
        for (Path src : files) {
            String rel = profileDir.relativize(src).toString().replace('\\', '/');
            if (rel.equals("options.properties")) { applyOptions(src, profilesDir); continue; }
            Path dst = mcDir.resolve(rel);
            String want = sha256(Files.readAllBytes(src));
            String key = "file." + rel;
            if (Files.exists(dst)) {
                String have = sha256(Files.readAllBytes(dst));
                if (have.equals(want)) { state.setProperty(key, have); continue; }
                boolean untouched = reset || have.equals(state.getProperty(key)) || anyProfileHas(profilesDir, rel, have);
                if (!untouched) { log("keep  " + rel + " (edited by you; PEACOCK_RESET=1 to overwrite)"); kept++; continue; }
            }
            Files.createDirectories(dst.getParent());
            Files.copy(src, dst, StandardCopyOption.REPLACE_EXISTING);
            state.setProperty(key, want);
            log("write " + rel);
            written++;
        }
        log("profile " + profile + ": " + written + " file(s) written, " + kept + " kept");
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

    // ---------------------------------------------------------------- options.txt keys
    static void applyOptions(Path fragment, Path profilesDir) throws IOException {
        Path options = mcDir.resolve("options.txt");
        if (!Files.exists(options)) { log("options.txt not present yet (first launch) - Default Options creates it; profile keys apply next launch"); return; }
        Properties want = new Properties();
        try (var in = Files.newInputStream(fragment)) { want.load(in); }
        // every value any profile uses for a key counts as "untouched"
        Map<String, Set<String>> profileValues = new HashMap<>();
        try (Stream<Path> s = Files.list(profilesDir)) {
            for (Path p : s.filter(Files::isDirectory).collect(Collectors.toList())) {
                Path f = p.resolve("options.properties");
                if (!Files.isRegularFile(f)) continue;
                Properties pp = new Properties();
                try (var in = Files.newInputStream(f)) { pp.load(in); }
                pp.forEach((k, v) -> profileValues.computeIfAbsent((String) k, x -> new HashSet<>()).add((String) v));
            }
        }
        List<String> lines = new ArrayList<>(Files.readAllLines(options, StandardCharsets.UTF_8));
        int changed = 0;
        for (String k : want.stringPropertyNames()) {
            String v = want.getProperty(k), stateKey = "option." + k;
            int idx = -1;
            for (int i = 0; i < lines.size(); i++) if (lines.get(i).startsWith(k + ":")) { idx = i; break; }
            if (idx < 0) { lines.add(k + ":" + v); state.setProperty(stateKey, v); changed++; continue; }
            String cur = lines.get(idx).substring(k.length() + 1);
            if (cur.equals(v)) { state.setProperty(stateKey, v); continue; }
            boolean untouched = reset || cur.equals(state.getProperty(stateKey)) || profileValues.getOrDefault(k, Set.of()).contains(cur);
            if (!untouched) continue;   // player changed it in-game
            lines.set(idx, k + ":" + v);
            state.setProperty(stateKey, v);
            changed++;
        }
        if (changed > 0) { Files.write(options, lines, StandardCharsets.UTF_8); log("options.txt: " + changed + " key(s) set"); }
    }

    // ---------------------------------------------------------------- util
    static Path findSelf() throws Exception {
        Path p = Paths.get(Launch.class.getProtectionDomain().getCodeSource().getLocation().toURI()).toAbsolutePath().normalize();
        if (Files.isRegularFile(p)) return p;                 // the jar
        throw new IllegalStateException("cannot locate peacock/launch.jar - run it with -jar by its full path");
    }

    static String listProfiles(Path dir) throws IOException {
        try (Stream<Path> s = Files.list(dir)) { return s.filter(Files::isDirectory).map(p -> p.getFileName().toString()).sorted().collect(Collectors.joining(", ")); }
    }

    static String sha256(byte[] b) throws IOException {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(b)); }
        catch (Exception e) { throw new IOException(e); }
    }

    static void log(String s) { System.out.println("[peacock] " + s); }
}
