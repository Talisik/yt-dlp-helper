import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/**
 * Browser names in detection order. First installed browser wins.
 * Matches yt-dlp --cookies-from-browser identifiers.
 */
const BROWSER_ORDER: readonly string[] = [
    "chrome",
    "chromium",
    "firefox",
    "edge",
    "brave",
    "opera",
    "vivaldi",
];

/**
 * Platform-specific directory paths used by each browser (profile/cookie data).
 * If the directory exists, we consider that browser installed.
 * Paths aligned with yt-dlp's cookies.py where applicable.
 */
/** Prefer HOME env (e.g. when run from Electron) so paths match the launching shell. */
export function getHomedir(): string {
    if (process.env.HOME) return process.env.HOME;
    return os.homedir();
}

function getBrowserPaths(homedirOverride?: string): Map<string, string> {
    const platform = os.platform();
    const homedir = homedirOverride ?? getHomedir();
    const out = new Map<string, string>();

    if (platform === "win32") {
        const local = process.env.LOCALAPPDATA || path.join(homedir, "AppData", "Local");
        const roaming = process.env.APPDATA || path.join(homedir, "AppData", "Roaming");
        out.set("chrome", path.join(local, "Google", "Chrome", "User Data"));
        out.set("chromium", path.join(local, "Chromium", "User Data"));
        out.set("firefox", path.join(roaming, "Mozilla", "Firefox", "Profiles"));
        out.set("edge", path.join(local, "Microsoft", "Edge", "User Data"));
        out.set("brave", path.join(local, "BraveSoftware", "Brave-Browser", "User Data"));
        out.set("opera", path.join(roaming, "Opera Software", "Opera Stable"));
        out.set("vivaldi", path.join(local, "Vivaldi", "User Data"));
        return out;
    }

    if (platform === "darwin") {
        const appSupport = path.join(homedir, "Library", "Application Support");
        out.set("chrome", path.join(appSupport, "Google", "Chrome"));
        out.set("chromium", path.join(appSupport, "Chromium"));
        out.set("firefox", path.join(appSupport, "Firefox", "Profiles"));
        out.set("edge", path.join(appSupport, "Microsoft Edge"));
        out.set("brave", path.join(appSupport, "BraveSoftware", "Brave-Browser"));
        out.set("opera", path.join(appSupport, "com.operasoftware.Opera"));
        out.set("vivaldi", path.join(appSupport, "Vivaldi"));
        return out;
    }

    // Linux and others: use XDG_CONFIG_HOME or ~/.config (homedir from getHomedir for consistency)
    const configHome =
        process.env.XDG_CONFIG_HOME || path.join(homedir, ".config");
    out.set("chrome", path.join(configHome, "google-chrome"));
    out.set("chromium", path.join(configHome, "chromium"));
    out.set("firefox", path.join(homedir, ".mozilla", "firefox"));
    out.set("edge", path.join(configHome, "microsoft-edge"));
    out.set("brave", path.join(configHome, "BraveSoftware", "Brave-Browser"));
    out.set("opera", path.join(configHome, "opera"));
    out.set("vivaldi", path.join(configHome, "vivaldi"));
    return out;
}

/**
 * Returns the first browser (in a fixed order) whose profile/data directory
 * exists on the current platform. Used to choose --cookies-from-browser when
 * the helper adds default cookies (e.g. for TikTok) and the app did not pass
 * cookiesFromBrowser.
 *
 * Order: chrome, chromium, firefox, edge, brave, opera, vivaldi.
 * Paths are platform-specific (Linux, Windows, macOS).
 * On Linux, Chrome is checked at both google-chrome and Google/Chrome under config.
 *
 * @param homedirOverride - Optional home directory (e.g. Electron app.getPath('home'))
 *        to use instead of getHomedir(). Use when the host process has a different
 *        env so detection fails with default homedir (e.g. YouTube in Electron).
 * @returns Browser name (e.g. "chrome", "firefox") or null if none found.
 */
export function detectFirstInstalledBrowser(homedirOverride?: string): string | null {
    const platform = os.platform();
    const homedir = homedirOverride ?? getHomedir();
    const paths = getBrowserPaths(homedir);
    for (const name of BROWSER_ORDER) {
        const dir = paths.get(name);
        if (dir && fs.existsSync(dir)) {
            return name;
        }
        // Linux: some Chrome installs use Google/Chrome instead of google-chrome
        if (name === "chrome" && platform !== "win32" && platform !== "darwin") {
            const configHome =
                process.env.XDG_CONFIG_HOME || path.join(homedir, ".config");
            const altDir = path.join(configHome, "Google", "Chrome");
            if (fs.existsSync(altDir)) {
                return name;
            }
        }
    }
    return null;
}

/**
 * Returns debug info for cookie/browser detection (paths and existence).
 * Used when YTDLP_HELPER_DEBUG_COOKIES=1 to diagnose why no browser was detected.
 */
export function getBrowserDetectionDebugInfo(homedirOverride?: string): {
    HOME: string | undefined;
    homedir: string;
    platform: string;
    browserPaths: { name: string; path: string; exists: boolean }[];
} {
    const homedir = homedirOverride ?? getHomedir();
    const paths = getBrowserPaths(homedir);
    const platform = os.platform();
    const browserPaths: { name: string; path: string; exists: boolean }[] = [];
    for (const name of BROWSER_ORDER) {
        const dir = paths.get(name);
        if (dir) {
            browserPaths.push({ name, path: dir, exists: fs.existsSync(dir) });
        }
        if (name === "chrome" && platform !== "win32" && platform !== "darwin") {
            const configHome =
                process.env.XDG_CONFIG_HOME || path.join(homedir, ".config");
            const altDir = path.join(configHome, "Google", "Chrome");
            browserPaths.push({
                name: "chrome (Google/Chrome)",
                path: altDir,
                exists: fs.existsSync(altDir),
            });
        }
    }
    return {
        HOME: process.env.HOME,
        homedir,
        platform,
        browserPaths,
    };
}
