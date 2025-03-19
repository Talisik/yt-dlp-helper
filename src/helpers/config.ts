export abstract class Config {
    static log: boolean = false;
    static ytdlpDownloadIntervalMS: number =
        24 * 60 * 60 * 1_000;

    /**
     * The last download time in milliseconds.
     */
    static ytdlpLastDownloadMS: number = 0;
}
