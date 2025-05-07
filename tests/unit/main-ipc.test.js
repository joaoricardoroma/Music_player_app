/**
 * Unit tests for IPC handlers in main.js
 * 
 * These tests focus on the IPC handlers that handle file system operations
 * and settings management. We mock the electron modules and file system
 * to test these handlers in isolation.
 */

// Mock dependencies
const mockDialog = {
  showOpenDialog: jest.fn()
};

const mockIpcMain = {
  handle: jest.fn((channel, listener) => {
    // Store the listener function so we can call it in tests
    mockIpcMain.handlers[channel] = listener;
  }),
  handlers: {}
};

const mockFs = {
  promises: {
    readdir: jest.fn(),
    stat: jest.fn()
  }
};

const mockStore = jest.fn().mockImplementation(() => ({
  get: jest.fn(),
  set: jest.fn()
}));

// Mock the electron modules
jest.mock('electron', () => ({
  app: {
    whenReady: jest.fn().mockResolvedValue(),
    on: jest.fn()
  },
  BrowserWindow: jest.fn(),
  ipcMain: mockIpcMain,
  dialog: mockDialog,
  nativeTheme: {
    shouldUseDarkColors: false
  },
  globalShortcut: {
    register: jest.fn(),
    unregisterAll: jest.fn()
  }
}));

// Mock the fs module
jest.mock('fs', () => ({
  promises: mockFs.promises,
  createReadStream: jest.fn()
}));

// Mock electron-store
jest.mock('electron-store', () => mockStore);

// Mock the service module
jest.mock('../../src/service', () => ({
  extractAudioMetadata: jest.fn().mockResolvedValue({
    title: 'Test Song',
    artist: 'Test Artist'
  }),
  fetchLyrics: jest.fn().mockResolvedValue('Test lyrics')
}));

// Import the main module to test
// Note: This will execute the file, registering the IPC handlers
require('../../src/main');

describe('Main Process IPC Handlers', () => {
  let storeInstance;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Get the store instance created in main.js
    storeInstance = mockStore.mock.results[0].value;
  });

  describe('File System Operations', () => {
    describe('select-folder', () => {
      it('should return the selected folder path', async () => {
        // Mock the dialog response
        mockDialog.showOpenDialog.mockResolvedValue({
          filePaths: ['/test/path']
        });

        // Call the handler
        const result = await mockIpcMain.handlers['select-folder']();

        // Assertions
        expect(mockDialog.showOpenDialog).toHaveBeenCalled();
        expect(result).toBe('/test/path');
      });
    });

    describe('read-directory', () => {
      it('should return filtered and processed audio files', async () => {
        // Mock file system responses
        const mockFiles = [
          { name: 'song1.mp3', isDirectory: () => false },
          { name: 'song2.wav', isDirectory: () => false },
          { name: 'song3.ogg', isDirectory: () => false },
          { name: 'document.txt', isDirectory: () => false },
          { name: 'subfolder', isDirectory: () => true }
        ];

        const mockStats = {
          size: 1024,
          mtime: new Date()
        };

        mockFs.promises.readdir.mockResolvedValue(mockFiles);
        mockFs.promises.stat.mockResolvedValue(mockStats);

        // Call the handler
        const result = await mockIpcMain.handlers['read-directory'](null, '/test/folder');

        // Assertions
        expect(mockFs.promises.readdir).toHaveBeenCalledWith('/test/folder', { withFileTypes: true });
        
        // Should only include the 3 audio files, not the text file or subfolder
        expect(result.length).toBe(3);
        
        // Check that each result has the expected properties
        result.forEach(file => {
          expect(file).toHaveProperty('name');
          expect(file).toHaveProperty('path');
          expect(file).toHaveProperty('isDirectory');
          expect(file).toHaveProperty('size');
          expect(file).toHaveProperty('modifiedDate');
          expect(file).toHaveProperty('metadata');
        });
      });
    });
  });

  describe('Settings Management', () => {
    describe('save-last-folder / get-last-folder', () => {
      it('should save and retrieve the last folder path', async () => {
        // Test saving
        const result1 = await mockIpcMain.handlers['save-last-folder'](null, '/test/last/folder');
        expect(storeInstance.set).toHaveBeenCalledWith('lastFolderPath', '/test/last/folder');
        expect(result1).toBe(true);

        // Mock the get response
        storeInstance.get.mockReturnValueOnce('/test/last/folder');

        // Test retrieving
        const result2 = await mockIpcMain.handlers['get-last-folder']();
        expect(storeInstance.get).toHaveBeenCalledWith('lastFolderPath', '');
        expect(result2).toBe('/test/last/folder');
      });
    });

    describe('save-volume / get-volume', () => {
      it('should save and retrieve the volume state', async () => {
        // Test saving
        const result1 = await mockIpcMain.handlers['save-volume'](null, 75);
        expect(storeInstance.set).toHaveBeenCalledWith('volumeState', 75);
        expect(result1).toBe(true);

        // Mock the get response
        storeInstance.get.mockReturnValueOnce(75);

        // Test retrieving
        const result2 = await mockIpcMain.handlers['get-volume']();
        expect(storeInstance.get).toHaveBeenCalledWith('volumeState', 100);
        expect(result2).toBe(75);
      });
    });

    describe('save-theme / get-theme', () => {
      it('should save and retrieve the theme preference', async () => {
        // Test saving
        const result1 = await mockIpcMain.handlers['save-theme'](null, 'dark');
        expect(storeInstance.set).toHaveBeenCalledWith('themePreference', 'dark');
        expect(result1).toBe(true);

        // Mock the get response
        storeInstance.get.mockReturnValueOnce('dark');

        // Test retrieving
        const result2 = await mockIpcMain.handlers['get-theme']();
        expect(storeInstance.get).toHaveBeenCalledWith('themePreference');
        expect(result2).toBe('dark');
      });

      it('should use system theme if no preference is saved', async () => {
        // Mock no saved preference
        storeInstance.get.mockReturnValueOnce(undefined);

        // Test retrieving
        const result = await mockIpcMain.handlers['get-theme']();
        expect(result).toBe('light'); // Based on mockNativeTheme.shouldUseDarkColors = false
      });
    });

    describe('save-visualizations-state / get-visualizations-state', () => {
      it('should save and retrieve the visualizations state', async () => {
        // Test saving
        const result1 = await mockIpcMain.handlers['save-visualizations-state'](null, true);
        expect(storeInstance.set).toHaveBeenCalledWith('visualizationsHidden', true);
        expect(result1).toBe(true);

        // Mock the get response
        storeInstance.get.mockReturnValueOnce(true);

        // Test retrieving
        const result2 = await mockIpcMain.handlers['get-visualizations-state']();
        expect(storeInstance.get).toHaveBeenCalledWith('visualizationsHidden', false);
        expect(result2).toBe(true);
      });
    });
  });

  describe('Media Operations', () => {
    describe('extract-metadata', () => {
      it('should call the service module to extract metadata', async () => {
        const { extractAudioMetadata } = require('../../src/service');
        
        // Call the handler
        const result = await mockIpcMain.handlers['extract-metadata'](null, '/test/song.mp3');
        
        // Assertions
        expect(extractAudioMetadata).toHaveBeenCalledWith('/test/song.mp3');
        expect(result).toEqual({
          title: 'Test Song',
          artist: 'Test Artist'
        });
      });
    });

    describe('fetch-lyrics', () => {
      it('should call the service module to fetch lyrics', async () => {
        const { fetchLyrics } = require('../../src/service');
        
        // Call the handler
        const result = await mockIpcMain.handlers['fetch-lyrics'](null, 'Test Artist', 'Test Song');
        
        // Assertions
        expect(fetchLyrics).toHaveBeenCalledWith('Test Artist', 'Test Song');
        expect(result).toBe('Test lyrics');
      });
    });
  });
});