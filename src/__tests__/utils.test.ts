import { describe, it, expect } from "vitest";
import {
    getDefaultMetadataOptionsForUrl,
    getMetadataArgs,
} from "../helpers/utils.js";

describe("utils", () => {
    describe("getDefaultMetadataOptionsForUrl", () => {
        it("returns undefined for youtube.com URLs (no default; app passes options when needed)", () => {
            expect(
                getDefaultMetadataOptionsForUrl(
                    "https://www.youtube.com/watch?v=abc"
                )
            ).toBeUndefined();
        });

        it("returns undefined for m.youtube.com URLs", () => {
            expect(
                getDefaultMetadataOptionsForUrl(
                    "https://m.youtube.com/watch?v=abc"
                )
            ).toBeUndefined();
        });

        it("returns platform-aware browser cookies for tiktok.com URLs (chromium on Linux, chrome elsewhere)", () => {
            const result = getDefaultMetadataOptionsForUrl(
                "https://www.tiktok.com/@user/video/123"
            );
            const expectedBrowser =
                process.platform === "linux" ? "chromium" : "chrome";
            expect(result).toEqual({
                cookiesFromBrowser: expectedBrowser,
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
