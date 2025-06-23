import * as https from 'https';
import * as os from 'os';
import * as fs from 'fs';
import { Terminal } from './terminal.js';
import { YT_DLP_FILE_NAME } from './constants.js';
import { Config } from './config.js';

/**
 * Pipes an http.IncomingMessage to a file and resolves the promise with the message on success, or rejects with the message on failure.
 * @param {import('http').IncomingMessage} message - The response from the http request.
 * @param {string} filePath - The path to save the file to.
 * @returns {Promise<import('http').IncomingMessage>} - A promise that resolves with the message on success, or rejects with the message on failure.
 */
function processMessageToFile(
    message: import('http').IncomingMessage,
    filePath: string
): Promise<import('http').IncomingMessage> {
    const file = fs.createWriteStream(filePath);

    return new Promise((resolve, reject) => {
        message.pipe(file);

        message.on('error', reject);

        file.on('finish', () =>
            message.statusCode == 200
                ? resolve(message)
                : reject(message)
        );
    });
}

/**
 * Creates a GET request to the given url and returns the response as a Promise.
 *
 * @param {string} url - The url to request.
 */
function createGetMessage(url: string): any {
    return new Promise((resolve, reject) => {
        https.get(url, (httpResponse) => {
            httpResponse.on('error', (e) => reject(e));
            resolve(httpResponse);
        });
    });
}

/**
 * Downloads a page of releases from the yt-dlp github repository.
 *
 * @param {number} page - The page of releases to download. Defaults to 1.
 * @param {number} perPage - The number of releases to download per page. Defaults to 1.
 *
 * @returns {Promise<any>} - A promise that resolves with the json response from the api.
 */
async function getGithubReleases(
    page: number = 1,
    perPage: number = 1
): Promise<any> {
    if (Config.log)
        console.debug(
            'Requesting YT-DLP releases from GitHub...'
        );

    return new Promise((resolve, reject) => {
        const apiURL =
            'https://api.github.com/repos/yt-dlp/yt-dlp/releases?page=' +
            page +
            '&per_page=' +
            perPage;

        https.get(
            apiURL,
            {
                headers: {
                    'User-Agent': 'node',
                },
            },
            (response) => {
                let value = '';

                response.setEncoding('utf8');

                response.on('data', (body) => (value += body));

                response.on('error', (e) => reject(e));

                response.on('end', () =>
                    response.statusCode == 200
                        ? resolve(JSON.parse(value))
                        : reject(response)
                );
            }
        );
    });
}

/**
 * Downloads a file from a given url and saves it to a given path.
 *
 * Handles redirects by following the Location header until it reaches the final
 * url. If the final url is not a redirect, it will save the file to the given
 * path.
 *
 * @param {string} fileURL - The url of the file to download.
 * @param {string} filePath - The path to save the file to.
 * @returns {Promise<import('http').IncomingMessage | null>} - A promise that resolves when the file has been
 * downloaded and saved.
 */
async function downloadFile(
    fileURL: string,
    filePath: string
): Promise<import('http').IncomingMessage | null> {
    if (Config.log) console.debug(`Downloading ${fileURL}...`);

    let currentUrl = fileURL;

    while (currentUrl) {
        const message = await createGetMessage(currentUrl);

        if (message.headers.location) {
            currentUrl = message.headers.location;
        } else {
            return await processMessageToFile(
                message,
                filePath
            );
        }
    }

    return null;
}

/**
 * Downloads the yt-dlp executable from the official github repository.
 *
 * @param {Object} [options] - The options for the function.
 * @param {string} [options.filePath] - The path to save the executable to.
 * Defaults to "./yt-dlp" or "./yt-dlp.exe" if the platform is win32.
 * @param {string} [options.version] - The version of yt-dlp to download.
 * Defaults to the latest version.
 * @param {string} [options.platform] - The platform to download the executable
 * for. Defaults to the current platform.
 * @param {boolean} [options.forceDownload] - If true, the executable will be
 * downloaded even if the file already exists. Defaults to false.
 *
 * @returns {Promise<void>} - A promise that resolves when the executable has
 * been downloaded and saved.
 */
export async function downloadYTDLP({
    filePath = null,
    version = undefined,
    platform = os.platform(),
    forceDownload = false,
}: {
    filePath?: string | null;
    version?: string | undefined;
    platform?: NodeJS.Platform;
    forceDownload?: boolean;
} = {}): Promise<void> {
    const currentVersion = await getYTDLPVersion();
    const nowMS = Date.now();

    if (
        !forceDownload &&
        currentVersion !== null &&
        nowMS - Config.ytdlpLastDownloadMS <
            Config.ytdlpDownloadIntervalMS
    ) {
        if (Config.log)
            console.debug('YT-DLP download attempt too early.');

        return;
    }

    Config.ytdlpLastDownloadMS = nowMS;

    const fileName = getYTDLPFileName(platform);

    if (!filePath) {
        filePath = './' + fileName;
    }

    if (!version && currentVersion) {
        if (Config.log)
            console.debug("Using YT-DLP's in-built updater...");

        await updateYTDLP(filePath);
        return;
    }

    if (!version) {
        version = (
            await getGithubReleases(1, 1)
        )[0].tag_name.trim();
    }

    if (!forceDownload && currentVersion === version) {
        return;
    }

    let fileURL =
        'https://github.com/yt-dlp/yt-dlp/releases/download/' +
        version +
        '/' +
        fileName;

    await downloadFile(fileURL, filePath);
}

/**
 * Retrieves the version of the yt-dlp executable.
 *
 * This function executes the yt-dlp executable with the '--version' flag
 * and listens for the output to obtain the version number. If the executable
 * is not found or an error occurs, the function returns null.
 *
 * @param {string | null} [binaryFilePath] - Optional. The path to the yt-dlp executable.
 * Defaults to null, which uses the path determined by the platform.
 *
 * @returns {Promise<string | null>} - A promise that resolves to the version string
 * of yt-dlp if successful, or null if the executable was not found or an error occurred.
 */
export async function getYTDLPVersion(
    binaryFilePath: string | null = null
): Promise<string | null> {
    const terminal = await Terminal.new({
        command: getYTDLPFilePath(binaryFilePath),
        args: ['--version'],
    });

    if (!terminal) {
        return null;
    }

    for await (const text of terminal.listen()) {
        if (text) {
            terminal.kill();

            return text.trim();
        }
    }

    return null;
}

/**
 * Updates the yt-dlp executable to the latest version.
 *
 * This function runs the yt-dlp executable with the '--update' flag.
 * If the executable is not found or an error occurs, the function returns false.
 *
 * @param {string | null} [binaryFilePath] - Optional. The path to the yt-dlp executable.
 * Defaults to null, which uses the path determined by the platform.
 *
 * @returns A promise that resolves to true if the update was
 * successful, or false if the executable was not found or an error occurred.
 */
export async function updateYTDLP(
    binaryFilePath: string | null = null
): Promise<boolean> {
    const terminal = await Terminal.new({
        command: getYTDLPFilePath(binaryFilePath),
        args: ['--update'],
    });

    if (!terminal) {
        return false;
    }

    await terminal.wait();

    return true;
}

/**
 * Retrieves the file name for the yt-dlp executable based on the platform.
 *
 * @param {string} [platform=os.platform()] - The operating system platform.
 * Defaults to the current platform.
 *
 * @returns The file name for the yt-dlp executable specific to the platform.
 * For 'win32', it returns 'yt-dlp.exe'. For 'linux', it returns 'yt-dlp_linux'.
 * For 'darwin', it returns 'yt-dlp_macos'. For other platforms, it returns 'yt-dlp'.
 */
function getYTDLPFileName(
    platform: NodeJS.Platform = os.platform()
): string {
    if (platform === 'win32') {
        return `${YT_DLP_FILE_NAME}.exe`;
    }

    if (platform === 'linux') {
        return `${YT_DLP_FILE_NAME}_linux`;
    }

    if (platform === 'darwin') {
        return `${YT_DLP_FILE_NAME}_macos`;
    }

    return YT_DLP_FILE_NAME;
}

/**
 * Retrieves the latest version of yt-dlp from the GitHub releases API.
 *
 * @returns {Promise<string | null>} - A promise that resolves to the latest version string
 * of yt-dlp if successful, or null if an error occurred.
 */
export async function getLatestYTDLPVersion(): Promise<string | null> {
    try {
        const releases = await getGithubReleases(1, 1);
        if (releases && releases.length > 0) {
            return releases[0].tag_name.trim();
        }
        return null;
    } catch (error) {
        if (Config.log) {
            console.error('Error retrieving latest yt-dlp version:', error);
        }
        return null;
    }
}

/**
 * Returns the path to the yt-dlp executable.
 *
 * If the binaryFilePath option is not provided, the path is determined by the platform.
 * If the platform is win32, the path is "./yt-dlp.exe". Otherwise, it is "./yt-dlp".
 *
 * @param {string} [binaryFilePath] - The path to the yt-dlp executable.
 * @returns {string} - A promise that resolves with the path to the yt-dlp executable.
 */
export function getYTDLPFilePath(
    binaryFilePath: string | null = null
): string {
    if (!binaryFilePath) {
        return `./${getYTDLPFileName()}`;
    }

    return binaryFilePath;
}
