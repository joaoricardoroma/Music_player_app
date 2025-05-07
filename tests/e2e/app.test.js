/**
 * End-to-End tests for the Electron Music Player application
 * 
 * These tests use Spectron to launch the application and interact with it
 * as a user would. They test critical user flows to ensure the application
 * works correctly from the user's perspective.
 */

const { Application } = require('spectron');
const path = require('path');
const fs = require('fs');

// Path to the Electron application
const electronPath = require('electron');
const appPath = path.join(__dirname, '../../');

describe('Electron Music Player', () => {
  let app;

  // Setup the application before tests
  beforeAll(async () => {
    // Create a temporary test folder with audio files for testing
    setupTestFolder();

    app = new Application({
      path: electronPath,
      args: [appPath],
      env: {
        NODE_ENV: 'test'
      },
      startTimeout: 10000
    });

    return app.start();
  }, 30000); // Increase timeout for app startup

  // Close the application after tests
  afterAll(async () => {
    if (app && app.isRunning()) {
      return app.stop();
    }
  });

  // Test that the application launches successfully
  it('should launch the application', async () => {
    // Check if the window is visible
    const isVisible = await app.browserWindow.isVisible();
    expect(isVisible).toBe(true);

    // Check the window title
    const title = await app.browserWindow.getTitle();
    expect(title).toBe('Music Player');
  });

  // Test folder selection and navigation
  it('should allow selecting a folder and display audio files', async () => {
    // Click the select folder button
    const selectFolderButton = await app.client.$('#selectFolder');
    await selectFolderButton.click();

    // Since we can't interact with the native file dialog in tests,
    // we'll simulate the selection by directly calling the IPC handler
    // This requires exposing a test-only IPC handler in main.js for testing
    await app.client.execute(() => {
      // Simulate selecting the test folder
      const testFolderPath = '/tmp/electron-music-player-test';
      window.ipcRenderer.invoke('test-select-folder', testFolderPath);
    });

    // Wait for files to load
    await app.client.pause(1000);

    // Check if files are displayed
    const fileItems = await app.client.$$('.file-item.audio-file');
    expect(fileItems.length).toBeGreaterThan(0);
  });

  // Test audio playback controls
  it('should play, pause, and navigate between tracks', async () => {
    // Click on the first audio file to play it
    const firstAudioFile = await app.client.$('.file-item.audio-file');
    await firstAudioFile.click();

    // Wait for audio to load
    await app.client.pause(1000);

    // Check if the play button shows pause icon (indicating playback)
    const playPauseBtn = await app.client.$('#playPauseBtn');
    let playPauseIcon = await playPauseBtn.$('i');
    let className = await playPauseIcon.getAttribute('class');
    expect(className).toContain('fa-pause');

    // Click play/pause button to pause
    await playPauseBtn.click();
    
    // Wait for state to update
    await app.client.pause(500);
    
    // Check if the play button shows play icon (indicating paused)
    playPauseIcon = await playPauseBtn.$('i');
    className = await playPauseIcon.getAttribute('class');
    expect(className).toContain('fa-play');

    // Click play/pause button to resume
    await playPauseBtn.click();
    
    // Wait for state to update
    await app.client.pause(500);
    
    // Check if playing again
    playPauseIcon = await playPauseBtn.$('i');
    className = await playPauseIcon.getAttribute('class');
    expect(className).toContain('fa-pause');

    // Test next button
    const nextBtn = await app.client.$('#nextBtn');
    await nextBtn.click();
    
    // Wait for track to change
    await app.client.pause(1000);
    
    // Check if still playing after track change
    playPauseIcon = await playPauseBtn.$('i');
    className = await playPauseIcon.getAttribute('class');
    expect(className).toContain('fa-pause');

    // Test previous button
    const prevBtn = await app.client.$('#prevBtn');
    await prevBtn.click();
    
    // Wait for track to change
    await app.client.pause(1000);
    
    // Check if still playing after track change
    playPauseIcon = await playPauseBtn.$('i');
    className = await playPauseIcon.getAttribute('class');
    expect(className).toContain('fa-pause');
  });

  // Test volume control
  it('should adjust volume', async () => {
    // Get the volume slider
    const volumeSlider = await app.client.$('#volumeSlider');
    
    // Get current value
    const initialValue = await volumeSlider.getAttribute('value');
    
    // Set to 50%
    await volumeSlider.setValue(50);
    
    // Wait for change to apply
    await app.client.pause(500);
    
    // Check new value
    const newValue = await volumeSlider.getAttribute('value');
    expect(parseInt(newValue)).toBe(50);
    
    // Check if the audio element's volume was updated
    const audioVolume = await app.client.execute(() => {
      return document.getElementById('audioElement').volume;
    });
    expect(audioVolume).toBeCloseTo(0.5, 1);
  });

  // Test theme switching
  it('should toggle between light and dark themes', async () => {
    // Get initial theme
    let isDarkTheme = await app.client.execute(() => {
      return document.body.classList.contains('dark-theme');
    });
    
    // Click theme toggle button
    const themeToggleBtn = await app.client.$('#themeToggle');
    await themeToggleBtn.click();
    
    // Wait for theme to change
    await app.client.pause(500);
    
    // Check if theme changed
    let newTheme = await app.client.execute(() => {
      return document.body.classList.contains('dark-theme');
    });
    expect(newTheme).not.toBe(isDarkTheme);
    
    // Toggle back
    await themeToggleBtn.click();
    
    // Wait for theme to change
    await app.client.pause(500);
    
    // Check if theme changed back
    newTheme = await app.client.execute(() => {
      return document.body.classList.contains('dark-theme');
    });
    expect(newTheme).toBe(isDarkTheme);
  });

  // Test visualizations toggle
  it('should toggle visualizations', async () => {
    // Get initial state
    let isHidden = await app.client.execute(() => {
      return document.querySelector('.visualizations').classList.contains('hidden');
    });
    
    // Click visualizations toggle button
    const toggleVisualizationsBtn = await app.client.$('#toggleVisualizations');
    await toggleVisualizationsBtn.click();
    
    // Wait for state to change
    await app.client.pause(500);
    
    // Check if state changed
    let newState = await app.client.execute(() => {
      return document.querySelector('.visualizations').classList.contains('hidden');
    });
    expect(newState).not.toBe(isHidden);
    
    // Toggle back
    await toggleVisualizationsBtn.click();
    
    // Wait for state to change
    await app.client.pause(500);
    
    // Check if state changed back
    newState = await app.client.execute(() => {
      return document.querySelector('.visualizations').classList.contains('hidden');
    });
    expect(newState).toBe(isHidden);
  });
});

// Helper function to set up a test folder with audio files
function setupTestFolder() {
  const testFolder = '/tmp/electron-music-player-test';
  
  // Create test folder if it doesn't exist
  if (!fs.existsSync(testFolder)) {
    fs.mkdirSync(testFolder, { recursive: true });
  }
  
  // Create dummy audio files (these won't actually contain audio data)
  const files = [
    'Test Artist - Test Song.mp3',
    'Another Artist - Another Song.mp3',
    'Third Artist - Third Song.mp3'
  ];
  
  files.forEach(file => {
    const filePath = path.join(testFolder, file);
    if (!fs.existsSync(filePath)) {
      // Create an empty file
      fs.writeFileSync(filePath, '');
    }
  });
}