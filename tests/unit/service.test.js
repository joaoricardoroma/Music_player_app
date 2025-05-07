const { extractAudioMetadata, fetchLyrics } = require('../../src/service');
const mm = require('music-metadata');
const axios = require('axios');
const path = require('path');

// Mock dependencies
jest.mock('music-metadata');
jest.mock('axios');

describe('Service Module', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractAudioMetadata', () => {
    it('should extract metadata correctly when all data is available', async () => {
      // Mock data
      const mockPicture = {
        format: 'image/jpeg',
        data: Buffer.from('test-image-data')
      };
      
      const mockMetadata = {
        common: {
          title: 'Test Song',
          artist: 'Test Artist',
          album: 'Test Album',
          year: 2023,
          genre: ['Rock'],
          picture: [mockPicture]
        },
        format: {
          duration: 180.5,
          bitrate: 320000,
          sampleRate: 44100,
          numberOfChannels: 2
        }
      };

      // Setup mock
      mm.parseFile.mockResolvedValue(mockMetadata);

      // Call function
      const result = await extractAudioMetadata('test/path/song.mp3');

      // Assertions
      expect(mm.parseFile).toHaveBeenCalledWith('test/path/song.mp3');
      expect(result).toEqual({
        title: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        year: 2023,
        genre: 'Rock',
        duration: 180.5,
        bitrate: 320000,
        sampleRate: 44100,
        channels: 2,
        coverArt: {
          format: 'image/jpeg',
          data: mockPicture.data.toString('base64')
        }
      });
    });

    it('should handle missing metadata and provide defaults', async () => {
      // Mock minimal metadata
      const mockMetadata = {
        common: {},
        format: {}
      };

      // Setup mock
      mm.parseFile.mockResolvedValue(mockMetadata);

      // Call function
      const result = await extractAudioMetadata('test/path/song.mp3');

      // Assertions
      expect(result).toEqual({
        title: 'song',
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        year: '',
        genre: '',
        duration: 0,
        bitrate: 0,
        sampleRate: 0,
        channels: 0,
        coverArt: null
      });
    });

    it('should handle errors and return default values', async () => {
      // Setup mock to throw error
      mm.parseFile.mockRejectedValue(new Error('Test error'));

      // Call function
      const result = await extractAudioMetadata('test/path/song.mp3');

      // Assertions
      expect(result).toEqual({
        title: 'song',
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        year: '',
        genre: '',
        duration: 0,
        bitrate: 0,
        sampleRate: 0,
        channels: 0,
        coverArt: null
      });
    });
  });

  describe('fetchLyrics', () => {
    it('should fetch lyrics successfully', async () => {
      // Mock data
      const mockLyrics = 'Test lyrics for the song';
      
      // Setup mock
      axios.get.mockResolvedValue({
        data: { lyrics: mockLyrics }
      });

      // Call function
      const result = await fetchLyrics('Test Artist', 'Test Song');

      // Assertions
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.lyrics.ovh/v1/Test%20Artist/Test%20Song'
      );
      expect(result).toBe(mockLyrics);
    });

    it('should handle errors when fetching lyrics', async () => {
      // Setup mock to throw error
      axios.get.mockRejectedValue(new Error('API error'));

      // Call function
      const result = await fetchLyrics('Test Artist', 'Test Song');

      // Assertions
      expect(result).toBe('Lyrics not found');
    });

    it('should properly encode artist and title in URL', async () => {
      // Mock data with special characters
      const artist = 'Artist & Co.';
      const title = 'Song: A "Special" Title';
      
      // Setup mock
      axios.get.mockResolvedValue({
        data: { lyrics: 'Test lyrics' }
      });

      // Call function
      await fetchLyrics(artist, title);

      // Assertions
      expect(axios.get).toHaveBeenCalledWith(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
      );
    });
  });
});