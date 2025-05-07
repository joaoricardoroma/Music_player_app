# Testing Methodology for Electron Music Player

This document outlines the testing approach for the Electron Music Player application, including the types of tests, what they cover, and how to run them.

## Overview

The testing strategy for this application includes:

1. **Unit Tests**: Testing individual functions and components in isolation
2. **End-to-End Tests**: Testing critical user flows from a user's perspective

The tests are implemented using Jest as the test runner and assertion library, with Spectron for end-to-end testing of the Electron application.

## Test Structure

```
tests/
├── unit/                  # Unit tests
│   ├── service.test.js    # Tests for metadata extraction and lyrics fetching
│   ├── renderer-utils.test.js  # Tests for utility functions from renderer.js
│   └── main-ipc.test.js   # Tests for IPC handlers in main.js
├── e2e/                   # End-to-end tests
│   └── app.test.js        # Tests for critical user flows
└── TESTING.md             # This documentation file
```

## Unit Tests

Unit tests focus on testing individual functions and components in isolation, mocking dependencies as needed.

### Service Module Tests (`service.test.js`)

Tests for the core functionality in `service.js`:

- **extractAudioMetadata**: Tests metadata extraction with various scenarios:
  - Complete metadata available
  - Missing metadata with fallback to defaults
  - Error handling

- **fetchLyrics**: Tests lyrics fetching functionality:
  - Successful lyrics retrieval
  - Error handling
  - URL encoding for special characters

### Renderer Utility Tests (`renderer-utils.test.js`)

Tests for utility functions from `renderer.js`:

- **formatTime**: Tests time formatting (seconds to MM:SS)
- **formatSize**: Tests file size formatting (bytes to human-readable)
- **smoothWaveformData**: Tests waveform data smoothing algorithm

### Main Process IPC Handler Tests (`main-ipc.test.js`)

Tests for IPC handlers in `main.js`:

- **File System Operations**:
  - Folder selection
  - Directory reading and filtering

- **Settings Management**:
  - Saving and retrieving folder paths
  - Volume state
  - Theme preferences
  - Visualizations state

- **Media Operations**:
  - Metadata extraction
  - Lyrics fetching

## End-to-End Tests

End-to-end tests use Spectron to launch the application and interact with it as a user would, testing critical user flows.

### Application Tests (`app.test.js`)

Tests for critical user flows:

- **Application Launch**: Tests that the app launches correctly
- **Folder Selection**: Tests selecting a folder and displaying audio files
- **Playback Controls**: Tests play, pause, next, and previous functionality
- **Volume Control**: Tests adjusting volume
- **Theme Switching**: Tests toggling between light and dark themes
- **Visualizations Toggle**: Tests showing and hiding visualizations

## Running Tests

To run the tests, use the following npm scripts:

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only end-to-end tests
npm run test:e2e
```

## Test Environment

The tests use a special test environment:

- Unit tests mock dependencies to isolate the code being tested
- End-to-end tests create a temporary test folder with dummy audio files
- A special test-only IPC handler is registered when running in test mode to simulate folder selection

## Coverage

Test coverage is collected automatically when running tests. To view the coverage report:

1. Run the tests with `npm test`
2. Open the coverage report at `coverage/lcov-report/index.html`

## Maintaining Tests

When adding new features or modifying existing ones:

1. Update or add unit tests for any modified functions
2. Update end-to-end tests if the user flow changes
3. Run the tests to ensure everything still works
4. Check the coverage report to ensure adequate test coverage

## Troubleshooting

Common issues and solutions:

- **End-to-end tests failing**: Make sure Spectron is compatible with your Electron version
- **Timeouts in tests**: Increase the timeout values for slow operations
- **Mocks not working**: Ensure the mock implementation matches the expected interface