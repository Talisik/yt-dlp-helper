import * as os from "os";
import { Terminal } from "./terminal.js";
import { BASE_ARGS } from "./constants.js";
import { Args, MetadataOptions } from "../interfaces/args.js";

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
