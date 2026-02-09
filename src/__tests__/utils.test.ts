import { describe, it, expect } from "vitest";
import { getMetadataArgs } from "../helpers/utils.js";

describe("utils", () => {
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
