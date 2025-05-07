/**
 * Unit tests for utility functions from renderer.js
 * 
 * Since renderer.js contains a lot of DOM manipulation code that requires a browser environment,
 * we're extracting just the pure utility functions for testing.
 */

// Import the functions to test
// Note: In a real implementation, these functions would ideally be in a separate utils.js file
// For testing purposes, we're recreating them here based on the renderer.js implementation

// Format time function (converts seconds to MM:SS format)
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

// Format size function (converts bytes to human-readable format)
function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Smooth waveform data function
function smoothWaveformData(data, smoothingFactor) {
  // Create a copy of the data array to avoid modifying the original
  const smoothedData = new Uint8Array(data.length);

  // Initialize with the first value
  smoothedData[0] = data[0];

  // Apply exponential moving average smoothing
  for (let i = 1; i < data.length; i++) {
    smoothedData[i] = Math.round(
      smoothingFactor * data[i] + (1 - smoothingFactor) * smoothedData[i - 1]
    );
  }

  return smoothedData;
}

describe('Renderer Utility Functions', () => {
  describe('formatTime', () => {
    it('should format seconds to MM:SS format', () => {
      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(30)).toBe('0:30');
      expect(formatTime(60)).toBe('1:00');
      expect(formatTime(90)).toBe('1:30');
      expect(formatTime(3661)).toBe('61:01'); // 1 hour, 1 minute, 1 second
    });

    it('should handle decimal seconds', () => {
      expect(formatTime(30.5)).toBe('0:30');
      expect(formatTime(90.9)).toBe('1:30');
    });

    it('should pad seconds with leading zero when less than 10', () => {
      expect(formatTime(61)).toBe('1:01');
      expect(formatTime(599)).toBe('9:59');
    });
  });

  describe('formatSize', () => {
    it('should handle zero bytes', () => {
      expect(formatSize(0)).toBe('0 Bytes');
    });

    it('should format bytes correctly', () => {
      expect(formatSize(500)).toBe('500 Bytes');
      expect(formatSize(1023)).toBe('1023 Bytes');
    });

    it('should format kilobytes correctly', () => {
      expect(formatSize(1024)).toBe('1 KB');
      expect(formatSize(1536)).toBe('1.5 KB');
      expect(formatSize(10240)).toBe('10 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatSize(1048576)).toBe('1 MB');
      expect(formatSize(5242880)).toBe('5 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(formatSize(1073741824)).toBe('1 GB');
    });

    it('should format terabytes correctly', () => {
      expect(formatSize(1099511627776)).toBe('1 TB');
    });
  });

  describe('smoothWaveformData', () => {
    it('should smooth data with the given smoothing factor', () => {
      // Create test data
      const testData = new Uint8Array([10, 20, 30, 40, 50]);
      const smoothingFactor = 0.5;

      // Expected result with 0.5 smoothing factor:
      // [10, 15, 22.5, 31.25, 40.625] -> rounded to [10, 15, 23, 31, 41]
      const expected = new Uint8Array([10, 15, 23, 31, 41]);
      
      const result = smoothWaveformData(testData, smoothingFactor);
      
      // Compare each element
      for (let i = 0; i < expected.length; i++) {
        expect(result[i]).toBe(expected[i]);
      }
    });

    it('should not modify the original data', () => {
      const original = new Uint8Array([10, 20, 30, 40, 50]);
      const originalCopy = new Uint8Array(original);
      
      smoothWaveformData(original, 0.5);
      
      // Original should remain unchanged
      for (let i = 0; i < original.length; i++) {
        expect(original[i]).toBe(originalCopy[i]);
      }
    });

    it('should handle extreme smoothing factors', () => {
      const testData = new Uint8Array([10, 20, 30, 40, 50]);
      
      // With smoothing factor 1.0, output should equal input
      const result1 = smoothWaveformData(testData, 1.0);
      for (let i = 0; i < testData.length; i++) {
        expect(result1[i]).toBe(testData[i]);
      }
      
      // With smoothing factor 0.0, all values should equal the first value
      const result0 = smoothWaveformData(testData, 0.0);
      for (let i = 0; i < testData.length; i++) {
        expect(result0[i]).toBe(testData[0]);
      }
    });
  });
});