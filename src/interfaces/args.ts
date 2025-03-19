export interface Args {
    /**
     * The URL of the video to be processed.
     */
    url: string;
    /**
     * The path to save the output file.
     */
    output?: string;
    /**
     * The format of the video to be downloaded.
     */
    videoFormat?: string;
    /**
     * The format of the audio to be extracted from the video.
     * If set, the video is converted to an audio-only file.
     */
    audioFormat?: string;
    /**
     * The quality of the extracted audio.
     * Requires `audioFormat`.
     *
     * Value must be between 0 to 10.
     *
     * Default = 5
     *
     * 0 = Best Quality
     *
     * 10 = Worst Quality
     */
    audioQuality?: string;
    /**
     * Currently supports:
     * avi, flv, gif, mkv, mov, mp4, webm, aac, aiff,
     * alac, flac, m4a, mka, mp3, ogg, opus, vorbis, wav
     */
    remuxVideo?: string;
    /**
     * Maximum download rate in bytes per second,
     * e.g. "50K" or "4.2M"
     */
    limitRate?: string;
}
