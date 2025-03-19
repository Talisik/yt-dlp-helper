export const DOWNLOAD_PROGRESS_RE = /^\[progress\]\s+(.+)/i;

export const ALREADY_DOWNLOADED_RE =
    /^\[download\]\s*.+\s*has already been downloaded/i;

export const EXTRACT_AUDIO_RE = /^\[ExtractAudio\]/i;

export const BASE_ARGS = [
    '--no-warnings',
    '--progress',
    '--newline',
    '--color',
    'never',
    '--progress-template',
    '[progress] %(progress)j',
];

export const YT_DLP_FILE_NAME = 'yt-dlp';
