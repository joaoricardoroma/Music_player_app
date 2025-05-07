# Electron Music Player

A cross-platform desktop music player application built with Electron for BSc (Hons) in Computing in IT.

## Features

- Browse and navigate through folders on your computer
- Display audio files with a distinct icon
- Play audio files (supports MP3, OGG, and WAV formats)
- Full playback controls (play/pause, previous, next)
- Media key support (play/pause, previous, next)
- Progress bar with seek functionality
- Volume control
- Track information display
- Lyrics display for currently playing tracks
- Desktop notifications for track changes
- Responsive design
- Light and dark themes with toggle button
- Spectrum analyzer visualization that reacts to music
- Waveform display visualization that reacts to music

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/joaoricardoroma/Music-Player.git
   cd Music-Player
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the application:
   ```
   npm start 
   ```

## Usage

1. Click the "Select Folder" button to choose a folder containing audio files
2. Navigate through folders using the breadcrumb navigation
3. Click on an audio file to play it
4. Use the player controls at the bottom of the window:
   - Play/Pause: Toggle playback
   - Previous: Go to previous track (or restart current track if more than 3 seconds in)
   - Next: Go to next track
   - Progress bar: Click anywhere to seek to that position
   - Volume slider: Adjust playback volume
   - Media keys: Control playback using your keyboard's media keys (play/pause, previous, next)
5. Desktop notifications:
   - Receive desktop notifications when tracks change
   - The notification shows the track title and artist
   - Click on a notification to focus the application window
   - You may need to grant notification permissions when prompted

6. Toggle between light and dark themes:
   - Click the theme toggle button (moon/sun icon) in the header
   - Your theme preference will be saved for future sessions
   - On first startup, the app will automatically use your OS system theme preference

7. Lyrics display:
   - View lyrics for the currently playing track
   - Toggle lyrics display on/off using the music note button next to the track info
   - Lyrics are automatically fetched when a track is played

8. Audio visualizations:
   - View real-time spectrum analyzer and waveform display that react to the music
   - Toggle visualizations on/off using the chart button next to the track info
   - Your visualization preference will be saved for future sessions

## Testing

The application includes comprehensive unit tests and end-to-end tests. To run the tests:

```
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only end-to-end tests
npm run test:e2e
```

For more details about the testing methodology, see [TESTING.md](tests/TESTING.md).

## Building for Distribution

To build the application for distribution:

```
npm run build
```

This will create platform-specific distribution files in the `dist` directory.

## License

This project is part of academic coursework for BSc (Hons) in Computing in IT.
