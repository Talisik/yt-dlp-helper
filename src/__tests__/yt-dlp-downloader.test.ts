import { describe, it, expect } from 'vitest';
import { getYTDLPFilePath, getLatestYTDLPVersion, getYTDLPVersion } from '../helpers/yt-dlp-downloader.js';

// Since getYTDLPFileName is not exported, we'll test getYTDLPFilePath which uses it
describe('yt-dlp-downloader', () => {
  describe('getYTDLPFilePath', () => {
    it('should return custom path when binaryFilePath is provided', () => {
      const customPath = '/custom/path/to/yt-dlp';
      const result = getYTDLPFilePath(customPath);
      
      expect(result).toBe(customPath);
    });

    it('should return default path when binaryFilePath is null', () => {
      const result = getYTDLPFilePath(null);
      
      // The result should start with './' and contain 'yt-dlp'
      expect(result).toMatch(/^\.\/yt-dlp/);
    });

    it('should return default path when binaryFilePath is undefined', () => {
      const result = getYTDLPFilePath();
      
      // The result should start with './' and contain 'yt-dlp'
      expect(result).toMatch(/^\.\/yt-dlp/);
    });
  });

  describe('getLatestYTDLPVersion', () => {
    it('should return the latest yt-dlp version from GitHub API', async () => {
      const result = await getLatestYTDLPVersion();
      
      // Should return a version string (not null)
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      expect(typeof result).toBe('string');
      
      // Version should match typical yt-dlp version format (YYYY.MM.DD or similar)
      expect(result).toMatch(/^\d{4}\.\d{1,2}\.\d{1,2}/);
      
      console.log(`Latest yt-dlp version: ${result}`);
    }, 10000); // 10 second timeout for API call

    it('should return a valid version string format', async () => {
      const result = await getLatestYTDLPVersion();
      
      if (result) {
        // Version should not have leading/trailing whitespace
        expect(result).toBe(result.trim());
        
        // Should be a reasonable length
        expect(result.length).toBeGreaterThan(5);
        expect(result.length).toBeLessThan(50);
        
        // Should contain at least one dot (typical version format)
        expect(result).toContain('.');
      } else {
        // If null, log for debugging but don't fail the test due to network issues
        console.warn('API call returned null - this might be due to network issues');
      }
    }, 10000);

    describe('getYTDLPVersion', () => {
      it('should return a version string when ./yt-dlp exists, or null when it does not', async () => {
        const result = await getYTDLPVersion();
        console.log(`System current version of yt-dlp: ${result}`);
        if (result === null) {
          expect(result).toBeNull();
        } else {
          expect(typeof result).toBe('string');
          expect(result).toMatch(/^\d{4}\.\d{1,2}\.\d{1,2}/);
        }
      });
    }, 10000);
  });
}); 