import * as os from "os";
import { Terminal } from "./terminal.js";
import { BASE_ARGS } from "./constants.js";
import { Args, MetadataOptions } from "../interfaces/args.js";
import { detectFirstInstalledBrowser } from "./browser-detect.js";

/**
 * Hostnames that always get default browser cookies when no options are passed
 * (TikTok). Uses first detected browser or platform fallback (chromium/chrome).
 */
const METADATA_COOKIE_HOSTS_ALWAYS = new Set([
    "tiktok.com",
    "www.tiktok.com",
]);

/**
 * Hostnames that get default browser cookies only when a browser is detected
 * (YouTube). No fallback: if none is detected, no cookies are added.
 */
const METADATA_COOKIE_HOSTS_OPTIONAL = new Set([
    "youtube.com",
    "www.youtube.com",
    "youtu.be",
]);

/**
 * Default browser for cookie extraction when the helper adds default cookies
 * (e.g. TikTok) and the app did not pass cookiesFromBrowser. Uses the first
 * installed browser (chrome, chromium, firefox, edge, brave, opera, vivaldi);
 * if none is detected, falls back to platform default (chromium on Linux,
 * chrome elsewhere).
 */
function getDefaultBrowserForTikTok(): string {
    const detected = detectFirstInstalledBrowser();
    if (detected !== null) {
        return detected;
    }
    return os.platform() === "linux" ? "chromium" : "chrome";
}

/**
 * Returns default metadata options for URLs that typically need cookies (TikTok, YouTube).
 * TikTok: browser is auto-detected or platform fallback (chromium/chrome).
 * YouTube (youtube.com, www.youtube.com, youtu.be): browser is used only if detected;
 * if none is found, no cookies are added so normal YouTube keeps working.
 * Caller can override by passing their own options to getInfo/getPlaylistInfo.
 */
export function getDefaultMetadataOptionsForUrl(url: string): MetadataOptions | undefined {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        if (METADATA_COOKIE_HOSTS_ALWAYS.has(hostname)) {
            return { cookiesFromBrowser: getDefaultBrowserForTikTok() };
        }
        if (METADATA_COOKIE_HOSTS_OPTIONAL.has(hostname)) {
            const browser = detectFirstInstalledBrowser();
            if (browser !== null) {
                return { cookiesFromBrowser: browser };
            }
        }
    } catch {
        // invalid URL
    }
    return undefined;
}

/**
 * Builds the argument prefix for metadata requests (getInfo, getPlaylistInfo).
 * Used for sites like TikTok that may require cookies or a specific user-agent.
 */
export function getMetadataArgs(options?: MetadataOptions | null): string[] {
    const args: string[] = [];
    if (options?.cookiesFromBrowser) {
        args.push("--cookies-from-browser", options.cookiesFromBrowser);
    }
    if (options?.userAgent) {
        args.push("--user-agent", options.userAgent);
    }
    return args;
}

/**
 * Constructs the arguments array for the yt-dlp executable based on the given Args object.
 *
 * @param {Args} args - The Args object.
 * @returns {string[]} The constructed arguments array.
 */
export function getArgs({
  url,
  output,
  videoFormat,
  audioFormat,
  audioQuality,
  remuxVideo,
  limitRate,
  cookiesFromBrowser,
}: Args): string[] {
  const args = [url, ...BASE_ARGS];

  if (output) {
    args.push("-o", output);
  }

  if (videoFormat) {
    args.push("--format", videoFormat);
  }

  if (audioFormat) {
    args.push("-x", "--audio-format", audioFormat);
  }

  if (audioQuality) {
    args.push("--audio-quality", audioQuality);
  }

  if (remuxVideo) {
    args.push("--remux-video", remuxVideo);
  }

  if (limitRate) {
    args.push("-r", limitRate);
  }

  if (cookiesFromBrowser) {
    args.push("--cookies-from-browser", cookiesFromBrowser);
  }

  return args;
}

export async function linuxPatch(binaryFilePath: string) {
  if (os.platform() === "linux") {
    const terminal = await Terminal.new({
      command: "chmod",
      args: ["+x", binaryFilePath],
    });

    if (!terminal) {
      return;
    }

    await terminal.wait();
  }
}
