import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import { detectFirstInstalledBrowser } from "../helpers/browser-detect.js";

vi.mock("fs", async (importOriginal) => {
    const actual = await importOriginal<typeof import("fs")>();
    return {
        ...actual,
        existsSync: vi.fn(),
    };
});

describe("browser-detect", () => {
    beforeEach(() => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
    });

    it("returns null when no browser paths exist", () => {
        expect(detectFirstInstalledBrowser()).toBeNull();
        expect(fs.existsSync).toHaveBeenCalled();
    });

    it("returns chrome when chrome path exists (first in order)", () => {
        vi.mocked(fs.existsSync).mockImplementation((path) => {
            const p = String(path);
            return (
                p.includes("Google") ||
                p.includes("google-chrome") ||
                (p.includes("Chrome") && !p.includes("Chromium") && !p.includes("Brave"))
            );
        });
        expect(detectFirstInstalledBrowser()).toBe("chrome");
    });

    it("returns chromium when only chromium path exists", () => {
        vi.mocked(fs.existsSync).mockImplementation((path) =>
            String(path).includes("chromium")
        );
        expect(detectFirstInstalledBrowser()).toBe("chromium");
    });

    it("returns firefox when firefox path exists", () => {
        vi.mocked(fs.existsSync).mockImplementation((path) =>
            String(path).includes("firefox")
        );
        expect(detectFirstInstalledBrowser()).toBe("firefox");
    });

    it("returns first browser in order when multiple exist", () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        expect(detectFirstInstalledBrowser()).toBe("chrome");
    });

    it("returns edge when only edge path exists", () => {
        vi.mocked(fs.existsSync).mockImplementation((path) =>
            String(path).includes("edge") || String(path).includes("Edge")
        );
        expect(detectFirstInstalledBrowser()).toBe("edge");
    });
});
