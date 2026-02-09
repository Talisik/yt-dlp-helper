import { describe, it, expect } from "vitest";
import { getInfo } from "../yt-dlp-helper.js";

const STABLE_YOUTUBE_URL = "https://www.youtube.com/watch?v=Qe9U1XzX36s";

/**
 * Integration tests require yt-dlp on PATH (or default ./yt-dlp) and network.
 * Run with: RUN_GETINFO_INTEGRATION=1 npm run test:run
 */
const runIntegrationTests = process.env.RUN_GETINFO_INTEGRATION === "1";

describe.skipIf(!runIntegrationTests)("getInfo (integration)", () => {
    it("returns metadata for a stable YouTube URL without options", async () => {
        const result = await getInfo(STABLE_YOUTUBE_URL);

        expect(result).toBeDefined();
        expect(result.ok).toBe(true);
        expect(result.data).toBeDefined();
        expect(typeof result.data?.title).toBe("string");
        expect(result.data?.title.length).toBeGreaterThan(0);
        expect(typeof result.data?.id).toBe("string");
        expect(result.data?.id).toBe("Qe9U1XzX36s");
    }, 30000);

    it("returns metadata for a stable YouTube URL with metadata options (cookiesFromBrowser)", async () => {
        const result = await getInfo(STABLE_YOUTUBE_URL, {
            cookiesFromBrowser: "chrome",
        });

        expect(result).toBeDefined();
        expect(result.ok).toBe(true);
        expect(result.data).toBeDefined();
        expect(typeof result.data?.title).toBe("string");
        expect(typeof result.data?.id).toBe("string");
    }, 30000);
});
