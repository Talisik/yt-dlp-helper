import {
    DOWNLOAD_PROGRESS_RE,
    ALREADY_DOWNLOADED_RE,
} from "./helpers/constants.js";
import { getArgs, linuxPatch } from "./helpers/utils.js";
import {
    downloadFFmpeg,
    getFFmpegLocation,
} from "./helpers/ffmpeg-downloader.js";
import { Terminal } from "./helpers/terminal.js";
import { Args } from "./interfaces/args.js";
import {
    downloadYTDLP,
    getYTDLPFilePath,
    getLatestYTDLPVersion,
} from "./helpers/yt-dlp-downloader.js";

/**
 * Invokes yt-dlp with the given arguments and options.
 *
 * If the downloadBinary option is set to true, the yt-dlp and ffmpeg binaries
 * will be downloaded from the official github repository if they do not exist.
 * Otherwise, the functions will assume that the binaries are already present.
 *
 * The function returns a new Terminal instance that can be used to control the
 * process.
 *
 * @param {{ytdlpDownloadDestination: string, ffmpegDownloadDestination: string, args: string[], downloadBinary: boolean, valueSelector: function}} options - The options for the function.
 * @param {string} options.ytdlpDownloadDestination - The path to the yt-dlp executable to download.
 * @param {string} options.ffmpegDownloadDestination - The path to the ffmpeg executable to download.
 * @param {string[]} options.args - The arguments to pass to yt-dlp.
 * @param {boolean} options.downloadBinary - If true, the executables will be downloaded if they do not exist.
 * @param {function(string): {stop?: boolean; data?: any}?} [options.valueSelector] - The value selector function. If null, the process will be treated as a normal process.
 *
 * @returns {Promise<Terminal | null>} - A promise that resolves with a new Terminal instance.
 */
async function invokeInternal({
    ytdlpDownloadDestination,
    ffmpegDownloadDestination,
    args,
    downloadBinary,
    valueSelector,
}: {
    ytdlpDownloadDestination: string;
    ffmpegDownloadDestination?: string;
    args: string[];
    downloadBinary: {
        ytdlp: boolean;
        ffmpeg: boolean;
    };
    valueSelector?: (text: string) => {
        stop?: boolean;
        data?: any;
    } | null;
}): Promise<Terminal | null> {
    if (downloadBinary.ytdlp) {
        await downloadYTDLP({
            filePath: ytdlpDownloadDestination,
        });
    }

    if (downloadBinary.ffmpeg) {
        await downloadFFmpeg({
            destination: ffmpegDownloadDestination || ".",
        });
    }

    const ffmpegPath = getFFmpegLocation();

    if (ffmpegPath) args = ["--ffmpeg-location", ffmpegPath, ...args];

    return await Terminal.new({
        command: ytdlpDownloadDestination,
        args,
        valueSelector,
    });
}

/**
 * Retrieves information about a given video url.
 *
 * The function runs the yt-dlp executable with the '--dump-json' argument to obtain
 * a JSON representation of the video.
 * If the executable is not present, it will be downloaded if the downloadBinary
 * option is set to true.
 *
 * @param {string} url - The url of the video to get information about.
 *
 * @returns {Promise<{ok: boolean, data: any}>} - A promise that resolves with an object
 * indicating whether the operation was successful and the video information.
 */
export async function getInfo(
    url: string
): Promise<{ ok: boolean; data?: any }> {
    const { data, ok } = await invoke({
        args: [url, "--no-warnings", "--dump-json"],
    });

    if (!ok)
        return {
            ok: false,
        };

    return {
        ok,
        data: JSON.parse(data || ""),
    };
}

/**
 * Manually downloads the latest yt-dlp.exe from the official GitHub repository.
 * This function forces a download of the latest version, regardless of whether
 * yt-dlp is already present or up to date.
 *
 * @param {Object} [options] - The options for the function.
 * @param {string} [options.filePath] - The path to save the executable to.
 * Defaults to "./yt-dlp.exe" on Windows or platform-specific filename.
 * @param {string} [options.platform] - The platform to download the executable for.
 * Defaults to the current platform.
 *
 * @returns {Promise<{ok: boolean, message: string}>} - A promise that resolves with
 * an object indicating whether the download was successful and a message.
 */
export async function manualDownloadLatestYTDLP({
    filePath,
    platform,
}: {
    filePath?: string;
    platform?: NodeJS.Platform;
} = {}): Promise<{ ok: boolean; message: string }> {
    try {
        await downloadYTDLP({
            filePath,
            platform,
            forceDownload: true, // Force download latest version
        });
        
        return {
            ok: true,
            message: "Successfully downloaded the latest yt-dlp executable.",
        };
    } catch (error) {
        return {
            ok: false,
            message: `Failed to download yt-dlp: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}

/**
 * Checks the latest available version of yt-dlp from the official GitHub repository.
 *
 * @returns {Promise<{ok: boolean, version?: string, message: string}>} - A promise that resolves with
 * an object indicating success, the latest version (if found), and a message.
 */
export async function getLatestYTDLPVersionFromGitHub(): Promise<{
    ok: boolean;
    version?: string;
    message: string;
}> {
    try {
        const version = await getLatestYTDLPVersion();
        
        if (version) {
            return {
                ok: true,
                version,
                message: `Latest yt-dlp version: ${version}`,
            };
        } else {
            return {
                ok: false,
                message: "Unable to retrieve the latest yt-dlp version from GitHub.",
            };
        }
    } catch (error) {
        return {
            ok: false,
            message: `Error retrieving latest yt-dlp version: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}

/**
 * Retrieves information about a playlist from a given URL.
 *
 * Executes the yt-dlp executable with the '--flat-playlist' and '-J' flags
 * to obtain a JSON representation of the playlist.
 * If the yt-dlp executable is not found, it will be downloaded if the
 * downloadBinary option is set to true.
 *
 * @param {Object} options - The options for the function.
 * @param {string} options.url - The URL of the playlist to retrieve information from.
 * @param {string} [options.ytdlpDownloadDestination] - The path to the yt-dlp executable.
 * @param {string} [options.ffmpegDownloadDestination] - The path to the ffmpeg executable.
 * @param {boolean} [options.downloadBinary=true] - Whether to download the yt-dlp executable if it's missing.
 *
 * @returns {Promise<{ok: boolean, data: any}>} - A promise resolving to an object indicating success and the retrieved playlist data or failure.
 */
export async function getPlaylistInfo({
    url,
    ytdlpDownloadDestination,
    ffmpegDownloadDestination,
    downloadBinary = {
        ytdlp: false,
        ffmpeg: true,
    },
}: {
    url: string;
    ytdlpDownloadDestination?: string;
    ffmpegDownloadDestination?: string;
    downloadBinary?: {
        ytdlp: boolean;
        ffmpeg: boolean;
    };
}): Promise<{ ok: boolean; data?: any }> {
    ytdlpDownloadDestination = getYTDLPFilePath(ytdlpDownloadDestination);

    await linuxPatch(ytdlpDownloadDestination);

    const terminal = await invokeInternal({
        ytdlpDownloadDestination,
        ffmpegDownloadDestination,
        args: ["--flat-playlist", "-J", url],
        downloadBinary,
    });

    if (!terminal)
        return {
            ok: false,
        };

    let value: any = {
        ok: false,
    };

    for await (const text of terminal.listen()) {
        try {
            const data = JSON.parse(text);

            if (!data) {
                continue;
            }

            value = {
                ok: true,
                data,
            };

            break;
        } catch {}
    }

    terminal.kill();

    return value;
}

function downloadValueSelector(text: string) {
    const alreadyDownloaded = ALREADY_DOWNLOADED_RE.exec(text);

    if (alreadyDownloaded != null) {
        return {
            stop: true,
        };
    }

    const progress = DOWNLOAD_PROGRESS_RE.exec(text);

    if (progress == null) {
        return { data: { log: text, value: null } };
    }

    return {
        data: {
            log: text,
            value: JSON.parse(progress[1])
        }
    };
}

/**
 * Downloads a video from a given URL and returns logs with progress information.
 *
 * The function utilizes the yt-dlp executable to download the video with the specified options.
 * It ensures the necessary binaries are available, downloading them if required.
 *
 * @param {Object} options - The options for the function.
 * @param {Args} options.args - The options for yt-dlp.
 * @param {string} [options.ytdlpDownloadDestination] - The path to the yt-dlp executable.
 * @param {string} [options.ffmpegDownloadDestination='.'] - The path to the ffmpeg executable.
 * @param {boolean} [options.downloadBinary=true] - If true, download the executables if not present.
 *
 */
export async function download({
    args,
    ytdlpDownloadDestination,
    ffmpegDownloadDestination = ".",
    downloadBinary = {
        ytdlp: false,
        ffmpeg: true,
    },
}: {
    args: Args;
    ytdlpDownloadDestination?: string;
    ffmpegDownloadDestination?: string;
    downloadBinary?: {
        ytdlp: boolean;
        ffmpeg: boolean;
    };
}): Promise<Terminal | null> {
    ytdlpDownloadDestination = getYTDLPFilePath(ytdlpDownloadDestination);

    await linuxPatch(ytdlpDownloadDestination);

    return await invokeInternal({
        ytdlpDownloadDestination,
        ffmpegDownloadDestination,
        args: getArgs(args),
        downloadBinary,
        valueSelector: downloadValueSelector,
    });
}


/**
 * Invokes the yt-dlp executable with the given arguments.
 *
 * The function runs the yt-dlp executable with the given arguments and returns a promise
 * that resolves with an object containing the stdout as a string, the exit code as a number,
 * and a boolean indicating whether the process exited successfully.
 *
 * If the executable does not exist, it will be downloaded from the official
 * github repository if the downloadBinary option is true.
 *
 * If the process fails, it will be retried up to the given number of times
 * with a delay of the given length between each retry.
 *
 * @param {Object} options - The options for the function.
 * @param {string} [options.ytdlpDownloadDestination] - The path to the yt-dlp executable to download.
 * @param {string} [options.ffmpegDownloadDestination] - The path to the ffmpeg executable to download.
 * @param {string[]} [options.args] - The arguments to pass to the yt-dlp executable. Defaults to an empty array.
 * @param {boolean} [options.downloadBinary=true] - If true, the executable will be downloaded if it does not exist.
 *
 * @returns {Promise<{data: string, exitCode: number, ok: boolean}>} - A promise that resolves with an object containing the stdout as a string, the exit code as a number, and a boolean indicating whether the process exited successfully.
 */
export async function invoke({
    ytdlpDownloadDestination,
    ffmpegDownloadDestination = ".",
    args = [],
    downloadBinary = {
        ytdlp: false,
        ffmpeg: true,
    },
}: {
    ytdlpDownloadDestination?: string;
    ffmpegDownloadDestination?: string;
    args?: string[];
    downloadBinary?: {
        ytdlp: boolean;
        ffmpeg: boolean;
    };
}): Promise<{ data?: string; exitCode?: number; ok: boolean }> {
    ytdlpDownloadDestination = getYTDLPFilePath(ytdlpDownloadDestination);

    await linuxPatch(ytdlpDownloadDestination);

    const terminal = await invokeInternal({
        ytdlpDownloadDestination,
        ffmpegDownloadDestination,
        args,
        downloadBinary,
    });

    if (!terminal) {
        return {
            ok: false,
        };
    }

    let data = "";

    for await (const text of terminal.listen()) {
        data += text;
    }

    return {
        data,
        exitCode: terminal.exitCode,
        ok: true,
    };
}

/**
 * Retrieves a Terminal instance using the provided unique identifier.
 *
 * @param {string} id - The unique identifier of the desired terminal.
 * @returns {Terminal} The corresponding terminal instance, or undefined if not found.
 */
export function getTerminalFromID(id: string): Terminal | null {
    return Terminal.fromID(id);
}
