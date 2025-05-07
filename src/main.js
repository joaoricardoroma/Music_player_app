/**
 * Electron Music Player - Main Process
 * 
 * This file handles the main process of the Electron application including:
 * - Application lifecycle management
 * - Window creation and management
 * - IPC communication with the renderer process
 * - File system operations
 * - Settings management
 * - Media key shortcuts
 */

// Core dependencies
const {app, BrowserWindow, ipcMain, dialog, nativeTheme, globalShortcut} = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

// Third-party dependencies
const Store = require('electron-store');

// Local modules
const {extractAudioMetadata, fetchLyrics} = require('./service');

// Initialize persistent storage
const store = new Store();

// Global references
let mainWindow;

/**
 * Window Management
 * 
 * Creates and configures the main application window
 */
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

/**
 * Application Lifecycle
 * 
 * Handles application startup, shutdown, and activation events
 */
app.whenReady().then(() => {
    createWindow();

    // Register media key shortcuts for controlling playback
    registerMediaShortcuts();

    // Register test-only IPC handlers if in test environment
    if (process.env.NODE_ENV === 'test') {
        registerTestHandlers();
    }
});

// Quit the application when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Unregister all shortcuts when app is about to quit
app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

// On macOS, recreate the window when the dock icon is clicked
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

/**
 * Media Key Shortcuts
 * 
 * Registers global shortcuts for media keys to control playback
 */
function registerMediaShortcuts() {
    globalShortcut.register('MediaPlayPause', () => {
        if (mainWindow) mainWindow.webContents.send('media-play-pause');
    });

    globalShortcut.register('MediaPreviousTrack', () => {
        if (mainWindow) mainWindow.webContents.send('media-previous-track');
    });

    globalShortcut.register('MediaNextTrack', () => {
        if (mainWindow) mainWindow.webContents.send('media-next-track');
    });
}

/**
 * Test Handlers
 * 
 * Registers IPC handlers that are only used in tests
 * These handlers allow tests to simulate user actions that would normally
 * involve native dialogs or other hard-to-automate interactions
 */
function registerTestHandlers() {
    // Handler to simulate folder selection
    ipcMain.handle('test-select-folder', async (event, folderPath) => {
        // Simulate the folder selection dialog
        if (mainWindow) {
            // First, save the folder path
            store.set('lastFolderPath', folderPath);

            // Then, notify the renderer process as if the user had selected this folder
            mainWindow.webContents.send('folder-selected', folderPath);

            return folderPath;
        }
        return null;
    });
}

/**
 * IPC Handlers
 * 
 * These handlers process requests from the renderer process
 */

/**
 * File System Operations
 * 
 * Handlers for file system related operations
 */
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    return result.filePaths[0];
});

ipcMain.handle('read-directory', async (event, folderPath) => {
    // Get all files in the directory
    const files = await fs.readdir(folderPath, {withFileTypes: true});

    // Filter for supported audio files and process them
    const supportedExtensions = ['.mp3', '.ogg', '.wav'];

    return Promise.all(
        files
            .filter((file) => 
                !file.isDirectory() && 
                supportedExtensions.includes(path.extname(file.name).toLowerCase())
            )
            .map(async (file) => {
                const filePath = path.join(folderPath, file.name);
                const stats = await fs.stat(filePath);

                // Return file information with metadata
                return {
                    name: file.name,
                    path: filePath,
                    isDirectory: file.isDirectory(),
                    size: stats.size,
                    modifiedDate: stats.mtime,
                    metadata: await extractAudioMetadata(filePath)
                };
            })
    );
});

/**
 * Settings Management
 * 
 * Handlers for saving and retrieving user preferences
 */

/**
 * Folder Path Settings
 * Remembers the last folder the user opened
 */
ipcMain.handle('save-last-folder', (event, folderPath) => {
    store.set('lastFolderPath', folderPath);
    return true;
});

ipcMain.handle('get-last-folder', () => {
    return store.get('lastFolderPath', '');
});

/**
 * Volume Settings
 * Persists the user's volume preference
 */
ipcMain.handle('save-volume', (event, volume) => {
    store.set('volumeState', volume);
    return true;
});

ipcMain.handle('get-volume', () => {
    return store.get('volumeState', 100); // Default to 100% volume
});

/**
 * Theme Settings
 * Manages the application's light/dark theme preference
 */
ipcMain.handle('save-theme', (event, theme) => {
    store.set('themePreference', theme);
    return true;
});

ipcMain.handle('get-theme', () => {
    // Check if user has a saved preference
    const userPreference = store.get('themePreference');
    if (userPreference) {
        return userPreference;
    }

    // If no user preference, use OS system theme
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
});

/**
 * Media Operations
 * 
 * Handlers for audio metadata and lyrics
 */

/**
 * Metadata Extraction
 * Extracts metadata from audio files (title, artist, album, etc.)
 */
ipcMain.handle('extract-metadata', async (event, filePath) => {
    return extractAudioMetadata(filePath);
});

/**
 * Lyrics Fetching
 * Retrieves lyrics for songs from external API
 */
ipcMain.handle('fetch-lyrics', async (event, artist, title) => {
    return fetchLyrics(artist, title);
});

/**
 * Visualizations Settings
 * Manages the visibility state of audio visualizations
 */
ipcMain.handle('save-visualizations-state', (event, isHidden) => {
    store.set('visualizationsHidden', isHidden);
    return true;
});

ipcMain.handle('get-visualizations-state', () => {
    return store.get('visualizationsHidden', false); // Default to visible
});
