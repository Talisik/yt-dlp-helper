import * as ffbinaries from 'ffbinaries';

/**
 * Downloads the ffmpeg executable and returns the path to it.
 *
 * The executable is downloaded by the ffbinaries package.
 *
 * @returns A promise that resolves with the path to the ffmpeg executable, or null if the download failed.
 */
export async function downloadFFmpeg({
    destination = '.',
}: {
    /**
     * The path to which the executable will be downloaded.
     * Defaults to the current working directory.
     */
    destination?: string;
}): Promise<string | null> {
    const path = getFFmpegLocation();

    if (path !== null) {
        return path;
    }

    return await new Promise((resolve) => {
        ffbinaries.downloadBinaries(
            ['ffmpeg'],
            {
                destination,
            },
            function (error: any, results: any) {
                if (error) {
                    return resolve(null);
                }

                resolve(results[0].path);
            }
        );
    });
}

/**
 * Finds the location of the ffmpeg executable.
 *
 * The function looks for the ffmpeg executable in the user's PATH and in the
 * current working directory. If the executable is found, the function returns
 * the path to it. Otherwise, null is returned.
 *
 * @returns The path to the ffmpeg executable, or null if the
 * executable is not found.
 */
export function getFFmpegLocation(): string | null {
    const { ffmpeg } = ffbinaries.locateBinariesSync([
        'ffmpeg',
    ]);

    if (ffmpeg.found) {
        return ffmpeg.path;
    }

    return null;
}
