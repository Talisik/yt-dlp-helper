import * as os from "os";
import { Terminal } from "./terminal.js";
import { BASE_ARGS } from "./constants.js";
import { Args, MetadataOptions } from "../interfaces/args.js";

/**
 * Hostnames that get default browser cookies when no options are passed.
 * Only TikTok is included: normal YouTube usually works without cookies; adding
 * Chrome by default for YouTube broke getInfo when Chrome isn't available (e.g.
 * in some Electron environments). For YouTube "made for kids" or bot checks,
 * the app should pass options (e.g. cookiesFromBrowser: "chrome") explicitly.
 */
const METADATA_COOKIE_HOSTS = new Set([
    "tiktok.com",
    "www.tiktok.com",
]);

/**
 * Default browser for TikTok cookie extraction, by platform.
 * Linux often has Chromium or Firefox but not Chrome; Windows typically has Chrome.
 */
function getDefaultBrowserForTikTok(): string {
    return os.platform() === "linux" ? "chromium" : "chrome";
}

/**
 * Returns default metadata options for URLs that typically need cookies (TikTok).
 * Browser is platform-aware: Linux uses "chromium", Windows/darwin use "chrome",
 * so getInfo doesn't assume Chrome on systems where it isn't installed.
 * Caller can override by passing their own options to getInfo/getPlaylistInfo.
 * YouTube is not included so normal YouTube keeps working without cookies.
 */
export function getDefaultMetadataOptionsForUrl(url: string): MetadataOptions | undefined {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        if (METADATA_COOKIE_HOSTS.has(hostname)) {
            return { cookiesFromBrowser: getDefaultBrowserForTikTok() };
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
