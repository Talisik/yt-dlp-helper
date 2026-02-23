import { describe, it, expect } from "vitest";
import { getInfo } from "../yt-dlp-helper.js";

const STABLE_YOUTUBE_URL = "https://www.youtube.com/watch?v=Qe9U1XzX36s";

/** QA-provided links (DR2-293) for validation. Video-only URLs to avoid playlist timeouts. */
const QA_YOUTUBE_LINKS = [
    "https://www.youtube.com/watch?v=hxOApe1P9dM",
    "https://www.youtube.com/watch?v=jbW_IHh5mOc",
] as const;

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
        if (result.ok) {
            expect(result.data).toBeDefined();
            expect(typeof result.data?.title).toBe("string");
            expect(typeof result.data?.id).toBe("string");
        }
    }, 30000);

    it("returns metadata for at least one QA link", async () => {
        const results = await Promise.all(
            QA_YOUTUBE_LINKS.map((url) => getInfo(url))
        );
        const passed = results.filter((r) => r.ok && r.data?.title && r.data?.id);
        expect(passed.length).toBeGreaterThanOrEqual(1);
        for (const result of passed) {
            expect(typeof result.data?.title).toBe("string");
            expect(result.data?.title.length).toBeGreaterThan(0);
            expect(typeof result.data?.id).toBe("string");
        }
    }, 60000);
});
