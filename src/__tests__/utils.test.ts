import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    getDefaultMetadataOptionsForUrl,
    getMetadataArgs,
} from "../helpers/utils.js";
import { detectFirstInstalledBrowser } from "../helpers/browser-detect.js";

vi.mock("../helpers/browser-detect.js", () => ({
    detectFirstInstalledBrowser: vi.fn(),
}));

describe("utils", () => {
    beforeEach(() => {
        vi.mocked(detectFirstInstalledBrowser).mockReturnValue(null);
    });

    describe("getDefaultMetadataOptionsForUrl", () => {
        it("returns undefined for youtube.com when no browser detected", () => {
            vi.mocked(detectFirstInstalledBrowser).mockReturnValue(null);
            expect(
                getDefaultMetadataOptionsForUrl(
                    "https://www.youtube.com/watch?v=abc"
                )
            ).toBeUndefined();
        });

        it("returns detected browser for youtube.com when one is installed", () => {
            vi.mocked(detectFirstInstalledBrowser).mockReturnValue("chrome");
            expect(
                getDefaultMetadataOptionsForUrl(
                    "https://www.youtube.com/watch?v=abc"
                )
            ).toEqual({ cookiesFromBrowser: "chrome" });
        });

        it("returns detected browser for youtube.com (no www) when one is installed", () => {
            vi.mocked(detectFirstInstalledBrowser).mockReturnValue("firefox");
            expect(
                getDefaultMetadataOptionsForUrl(
                    "https://youtube.com/watch?v=abc"
                )
            ).toEqual({ cookiesFromBrowser: "firefox" });
        });

        it("returns detected browser for youtu.be when one is installed", () => {
            vi.mocked(detectFirstInstalledBrowser).mockReturnValue("edge");
            expect(
                getDefaultMetadataOptionsForUrl("https://youtu.be/abc")
            ).toEqual({ cookiesFromBrowser: "edge" });
        });

        it("returns undefined for youtu.be when no browser detected", () => {
            vi.mocked(detectFirstInstalledBrowser).mockReturnValue(null);
            expect(
                getDefaultMetadataOptionsForUrl("https://youtu.be/abc")
            ).toBeUndefined();
        });

        it("returns undefined for m.youtube.com (not in optional list)", () => {
            vi.mocked(detectFirstInstalledBrowser).mockReturnValue("chrome");
            expect(
                getDefaultMetadataOptionsForUrl(
                    "https://m.youtube.com/watch?v=abc"
                )
            ).toBeUndefined();
        });

        it("returns platform fallback for tiktok.com when no browser detected (chromium on Linux, chrome elsewhere)", () => {
            vi.mocked(detectFirstInstalledBrowser).mockReturnValue(null);
            const result = getDefaultMetadataOptionsForUrl(
                "https://www.tiktok.com/@user/video/123"
            );
            const expectedBrowser =
                process.platform === "linux" ? "chromium" : "chrome";
            expect(result).toEqual({
                cookiesFromBrowser: expectedBrowser,
            });
        });

        it("returns first detected browser for tiktok.com when one is installed", () => {
            vi.mocked(detectFirstInstalledBrowser).mockReturnValue("firefox");
            const result = getDefaultMetadataOptionsForUrl(
                "https://www.tiktok.com/@user/video/123"
            );
            expect(result).toEqual({
                cookiesFromBrowser: "firefox",
            });
        });

        it("returns undefined for non-TikTok URLs", () => {
            expect(
                getDefaultMetadataOptionsForUrl("https://example.com/video")
            ).toBeUndefined();
        });

        it("returns undefined for invalid URL", () => {
            expect(getDefaultMetadataOptionsForUrl("not-a-url")).toBeUndefined();
        });
    });

    describe("getMetadataArgs", () => {
        it("returns empty array when no options provided", () => {
            expect(getMetadataArgs()).toEqual([]);
        });

        it("returns empty array when options is null", () => {
            expect(getMetadataArgs(null)).toEqual([]);
        });

        it("returns empty array when options is empty object", () => {
            expect(getMetadataArgs({})).toEqual([]);
        });

        it("returns cookies-from-browser args when cookiesFromBrowser is set", () => {
            expect(getMetadataArgs({ cookiesFromBrowser: "chrome" })).toEqual([
                "--cookies-from-browser",
                "chrome",
            ]);
        });

        it("returns user-agent args when userAgent is set", () => {
            const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...";
            expect(getMetadataArgs({ userAgent: ua })).toEqual([
                "--user-agent",
                ua,
            ]);
        });

        it("returns both cookies and user-agent in correct order when both set", () => {
            const ua = "CustomAgent/1.0";
            expect(
                getMetadataArgs({
                    cookiesFromBrowser: "firefox",
                    userAgent: ua,
                })
            ).toEqual([
                "--cookies-from-browser",
                "firefox",
                "--user-agent",
                ua,
            ]);
        });

        it("handles edge browser for cookiesFromBrowser", () => {
            expect(getMetadataArgs({ cookiesFromBrowser: "edge" })).toEqual([
                "--cookies-from-browser",
                "edge",
            ]);
        });
    });
});
