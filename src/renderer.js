const { ipcRenderer } = require('electron');
const path = require('path');

let currentPath = '';
let audioFiles = [];
let currentTrackIndex = -1;
let isPlaying = false;

// DOM Elements
const audioElement = document.getElementById('audioElement');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const volumeSlider = document.getElementById('volumeSlider');
const progressBar = document.getElementById('progress');
const currentTimeDisplay = document.getElementById('currentTime');
const totalTimeDisplay = document.getElementById('totalTime');
const trackNameDisplay = document.querySelector('.track-name');
const trackArtistDisplay = document.querySelector('.track-artist');
const trackArtDisplay = document.querySelector('.track-art');
const themeToggleBtn = document.getElementById('themeToggle');
const toggleVisualizationsBtn = document.getElementById('toggleVisualizations');
const toggleLyricsBtn = document.getElementById('toggleLyrics');
const visualizationsContainer = document.querySelector('.visualizations');
const lyricsContainer = document.querySelector('.lyrics-container');
const lyricsContent = document.getElementById('lyricsContent');
const spectrumCanvas = document.getElementById('spectrumAnalyzer');
const waveformCanvas = document.getElementById('waveformDisplay');

// Web Audio API setup
let audioContext;
let analyser;
let dataArray;
let waveformDataArray;
let spectrumCanvasCtx = spectrumCanvas.getContext('2d');
let waveformCanvasCtx = waveformCanvas.getContext('2d');
let animationId;

// Initialize Web Audio API
function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Create analyzer node
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    // Create a second analyzer for the waveform
    waveformAnalyser = audioContext.createAnalyser();
    waveformAnalyser.fftSize = 2048;
    const waveformBufferLength = waveformAnalyser.frequencyBinCount;
    waveformDataArray = new Uint8Array(waveformBufferLength);

    // Connect audio element to the Web Audio API
    const source = audioContext.createMediaElementSource(audioElement);
    source.connect(analyser);
    source.connect(waveformAnalyser);
    analyser.connect(audioContext.destination);
    waveformAnalyser.connect(audioContext.destination);

    // Start the visualization loop
    visualize();
  }
}

// Draw spectrum analyzer
function drawSpectrum() {
  const width = spectrumCanvas.width;
  const height = spectrumCanvas.height;
  const barWidth = (width / dataArray.length) * 2.5;

  // Clear the canvas
  spectrumCanvasCtx.clearRect(0, 0, width, height);

  // Get the frequency data
  analyser.getByteFrequencyData(dataArray);

  // Set the fill style based on the current theme
  const isDarkTheme = document.body.classList.contains('dark-theme');

  // Draw the bars with individual colors based on frequency
  let x = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const barHeight = (dataArray[i] / 255) * height;

    // Skip drawing very small bars to reduce visual noise
    if (barHeight < 1) {
      x += barWidth + 1;
      continue;
    }

    // Create a gradient for each bar
    const barGradient = spectrumCanvasCtx.createLinearGradient(
      x, height - barHeight,
      x, height
    );

    // Calculate a hue based on the frequency (i) and amplitude (barHeight)
    // This creates a rainbow effect across the spectrum
    const hue = (i / dataArray.length * 360) % 360;

    if (isDarkTheme) {
      barGradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.9)`);
      barGradient.addColorStop(1, `hsla(${hue}, 80%, 40%, 0.8)`);
    } else {
      barGradient.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.9)`);
      barGradient.addColorStop(1, `hsla(${hue}, 80%, 30%, 0.8)`);
    }

    spectrumCanvasCtx.fillStyle = barGradient;

    // Draw the bar with rounded top
    spectrumCanvasCtx.beginPath();
    spectrumCanvasCtx.moveTo(x, height);
    spectrumCanvasCtx.lineTo(x, height - barHeight + barWidth/2);
    spectrumCanvasCtx.arcTo(x, height - barHeight, x + barWidth/2, height - barHeight, barWidth/2);
    spectrumCanvasCtx.arcTo(x + barWidth, height - barHeight, x + barWidth, height - barHeight + barWidth/2, barWidth/2);
    spectrumCanvasCtx.lineTo(x + barWidth, height);
    spectrumCanvasCtx.closePath();
    spectrumCanvasCtx.fill();

    // Add a subtle glow effect for higher frequencies
    if (barHeight > height * 0.4 && i > dataArray.length * 0.6) {
      spectrumCanvasCtx.shadowColor = `hsla(${hue}, 100%, 70%, 0.8)`;
      spectrumCanvasCtx.shadowBlur = 10;
      spectrumCanvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);
      spectrumCanvasCtx.shadowBlur = 0;
    }

    x += barWidth + 1;
  }
}

// Draw waveform
function drawWaveform() {
  const width = waveformCanvas.width;
  const height = waveformCanvas.height;

  // Clear the canvas
  waveformCanvasCtx.clearRect(0, 0, width, height);

  // Get the time domain data
  waveformAnalyser.getByteTimeDomainData(waveformDataArray);

  // Create a smoothed version of the data to reduce shakiness
  const smoothedData = smoothWaveformData(waveformDataArray, 0.8);

  // Set the line style based on the current theme
  const isDarkTheme = document.body.classList.contains('dark-theme');

  // Create gradient for the waveform
  const gradient = waveformCanvasCtx.createLinearGradient(0, 0, 0, height);

  if (isDarkTheme) {
    gradient.addColorStop(0, '#8c1aff'); // Purple
    gradient.addColorStop(0.5, '#4da6ff'); // Blue
    gradient.addColorStop(1, '#00ccff'); // Cyan
  } else {
    gradient.addColorStop(0, '#ff3366'); // Pink
    gradient.addColorStop(0.5, '#007bff'); // Blue
    gradient.addColorStop(1, '#00cccc'); // Teal
  }

  // Draw the filled waveform
  waveformCanvasCtx.beginPath();
  waveformCanvasCtx.moveTo(0, height / 2);

  const sliceWidth = width / smoothedData.length;
  let x = 0;

  for (let i = 0; i < smoothedData.length; i++) {
    const v = smoothedData[i] / 128.0;
    const y = v * height / 2;

    waveformCanvasCtx.lineTo(x, y);
    x += sliceWidth;
  }

  // Complete the path to create a closed shape for filling
  waveformCanvasCtx.lineTo(width, height / 2);

  // Fill the waveform
  waveformCanvasCtx.fillStyle = gradient;
  waveformCanvasCtx.fill();

  // Add a stroke around the filled area for better definition
  waveformCanvasCtx.strokeStyle = isDarkTheme ? '#ffffff' : '#000000';
  waveformCanvasCtx.lineWidth = 1;
  waveformCanvasCtx.globalAlpha = 0.3;
  waveformCanvasCtx.stroke();
  waveformCanvasCtx.globalAlpha = 1.0;
}

// Smooth waveform data to reduce shakiness
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

// Animation loop for visualizations
function visualize() {
  // Only run if audio is playing
  if (isPlaying) {
    drawSpectrum();
    drawWaveform();
  }

  animationId = requestAnimationFrame(visualize);
}

// Resize canvas elements to match their display size
function resizeCanvases() {
  spectrumCanvas.width = spectrumCanvas.clientWidth;
  spectrumCanvas.height = spectrumCanvas.clientHeight;
  waveformCanvas.width = waveformCanvas.clientWidth;
  waveformCanvas.height = waveformCanvas.clientHeight;
}

// Handle window resize
window.addEventListener('resize', resizeCanvases);

// Initialize canvas sizes
resizeCanvases();

// Event Listeners for Audio Player
playPauseBtn.addEventListener('click', togglePlayPause);
prevBtn.addEventListener('click', playPreviousTrack);
nextBtn.addEventListener('click', playNextTrack);
volumeSlider.addEventListener('input', updateVolume);
audioElement.addEventListener('timeupdate', updateProgress);
audioElement.addEventListener('ended', playNextTrack);
document.querySelector('.progress-bar').addEventListener('click', seekTo);

// Theme toggle event listener
themeToggleBtn.addEventListener('click', toggleTheme);

// Visualizations toggle event listener
toggleVisualizationsBtn.addEventListener('click', toggleVisualizations);

// Lyrics toggle event listener
toggleLyricsBtn.addEventListener('click', toggleLyrics);

// Function to toggle visualizations visibility
function toggleVisualizations() {
  visualizationsContainer.classList.toggle('hidden');

  // Save the visibility state
  const isHidden = visualizationsContainer.classList.contains('hidden');
  ipcRenderer.invoke('save-visualizations-state', isHidden);

  // Update the toggle button icon
  updateVisualizationsToggleIcon(isHidden);
}

// Update the visualizations toggle button icon
function updateVisualizationsToggleIcon(isHidden) {
  if (isHidden) {
    toggleVisualizationsBtn.innerHTML = '<i class="fas fa-chart-bar" style="opacity: 0.5;"></i>';
    toggleVisualizationsBtn.title = "Show Visualizations";
  } else {
    toggleVisualizationsBtn.innerHTML = '<i class="fas fa-chart-bar"></i>';
    toggleVisualizationsBtn.title = "Hide Visualizations";
  }
}

// Function to toggle lyrics visibility
function toggleLyrics() {
  lyricsContainer.classList.toggle('hidden');

  // Update the toggle button icon
  const isHidden = lyricsContainer.classList.contains('hidden');
  updateLyricsToggleIcon(isHidden);
}

// Update the lyrics toggle button icon
function updateLyricsToggleIcon(isHidden) {
  if (isHidden) {
    toggleLyricsBtn.innerHTML = '<i class="fas fa-music" style="opacity: 0.5;"></i>';
    toggleLyricsBtn.title = "Show Lyrics";
  } else {
    toggleLyricsBtn.innerHTML = '<i class="fas fa-music"></i>';
    toggleLyricsBtn.title = "Hide Lyrics";
  }
}

// Function to fetch and display lyrics
async function fetchAndDisplayLyrics(artist, title) {
  try {
    lyricsContent.textContent = "Loading lyrics...";

    // Fetch lyrics from the main process
    const lyrics = await ipcRenderer.invoke('fetch-lyrics', artist, title);

    // Display lyrics
    lyricsContent.textContent = lyrics;
  } catch (error) {
    console.error('Error fetching lyrics:', error);
    lyricsContent.textContent = "Lyrics not available";
  }
}

// Load the last used folder path, volume state, theme, and visualizations state when the application starts
window.addEventListener('DOMContentLoaded', async () => {
  // Load last folder path
  const lastFolderPath = await ipcRenderer.invoke('get-last-folder');
  if (lastFolderPath) {
    currentPath = lastFolderPath;
    updateBreadcrumb();
    loadFolder(lastFolderPath);
  }

  // Load visualizations state
  const visualizationsHidden = await ipcRenderer.invoke('get-visualizations-state');
  if (visualizationsHidden) {
    visualizationsContainer.classList.add('hidden');
  }
  updateVisualizationsToggleIcon(visualizationsHidden);

  // Load volume state
  const savedVolume = await ipcRenderer.invoke('get-volume');
  volumeSlider.value = savedVolume;
  audioElement.volume = savedVolume / 100;

  // Load theme preference
  const savedTheme = await ipcRenderer.invoke('get-theme');
  setTheme(savedTheme);

  // Initialize lyrics container as hidden
  updateLyricsToggleIcon(true);

  // Initialize canvas sizes
  resizeCanvases();

  // Set up media key event listeners
  ipcRenderer.on('media-play-pause', togglePlayPause);
  ipcRenderer.on('media-previous-track', playPreviousTrack);
  ipcRenderer.on('media-next-track', playNextTrack);

  // Set up test event listeners (only used in test environment)
  ipcRenderer.on('folder-selected', (event, folderPath) => {
    if (folderPath) {
      currentPath = folderPath;
      updateBreadcrumb();
      loadFolder(folderPath);
    }
  });
});

// Folder Selection
document.getElementById('selectFolder').addEventListener('click', async () => {
  const folderPath = await ipcRenderer.invoke('select-folder');
  if (folderPath) {
    currentPath = folderPath;
    updateBreadcrumb();
    loadFolder(folderPath);
    // Save the selected folder path
    ipcRenderer.invoke('save-last-folder', folderPath);
  }
});

async function loadFolder(folderPath) {
  try {
    const files = await ipcRenderer.invoke('read-directory', folderPath);
    displayFiles(files);

    // Update audio files list
    audioFiles = files.filter(file =>
      ['.mp3', '.ogg', '.wav'].includes(path.extname(file.name).toLowerCase())
    );

    // Reset player if we're loading a new folder
    if (currentTrackIndex !== -1) {
      currentTrackIndex = -1;
      audioElement.pause();
      audioElement.src = '';
      isPlaying = false;
      updatePlayPauseIcon();
      updateTrackInfo();
    }
  } catch (error) {
    console.error('Error loading folder:', error);
  }
}

function displayFiles(files) {
  const fileGrid = document.getElementById('fileGrid');
  fileGrid.innerHTML = '';

  files.forEach(file => {
    const isAudioFile = ['.mp3', '.ogg', '.wav'].includes(path.extname(file.name).toLowerCase());
    const fileElement = document.createElement('div');
    fileElement.className = `file-item ${file.isDirectory ? 'directory' : 'file'} ${isAudioFile ? 'audio-file' : ''}`;

    let coverArt = ``
    if (file.metadata.coverArt) {
      coverArt = `<img alt="" width="100" height="100" src="data:${file.metadata.coverArt.format};base64,${file.metadata.coverArt.data}"/>`
    }

    let fileContent = `
      <div class="file-icon">
            ${coverArt}
      </div>
      <div class="file-info">
        <span>${formatSize(file.size)}</span>
        <span>${new Date(file.modifiedDate).toLocaleDateString()}</span>
      </div>
    `;

    // Add metadata information for audio files
    if (isAudioFile && file.metadata) {
      fileContent += `
      <div class="file-metadata">
        <div class="metadata-title">${file.metadata.title}</div>
        <div class="metadata-artist">${file.metadata.artist}</div>
        <div class="metadata-duration">${formatTime(file.metadata.duration)}</div>
      </div>
      `;
    }

    fileElement.innerHTML = fileContent;

    if (file.isDirectory) {
      fileElement.addEventListener('click', () => {
        currentPath = file.path;
        updateBreadcrumb();
        loadFolder(file.path);
        // Save the current path when navigating to a subfolder
        ipcRenderer.invoke('save-last-folder', file.path);
      });
    } else if (isAudioFile) {
      fileElement.addEventListener('click', () => {
        const index = audioFiles.findIndex(audioFile => audioFile.path === file.path);
        if (index !== -1) {
          playTrack(index);
        }
      });
    }

    fileGrid.appendChild(fileElement);
  });
}

function updateBreadcrumb() {
  const breadcrumb = document.getElementById('currentMediaPath');
  const parts = currentPath.split(/[\\/]/);

  breadcrumb.innerHTML = parts
    .map((part, index) => {
      const path = parts.slice(0, index + 1).join('/');
      return `<span class="breadcrumb-item" data-path="${path}">${part || 'Root'}</span>`;
    })
    .join(' / ');

  breadcrumb.querySelectorAll('.breadcrumb-item').forEach(item => {
    item.addEventListener('click', () => {
      currentPath = item.dataset.path;
      updateBreadcrumb();
      loadFolder(currentPath);
      // Save the current path when it changes
      ipcRenderer.invoke('save-last-folder', currentPath);
    });
  });
}

function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Audio Player Functions
function playTrack(index) {
  if (index >= 0 && index < audioFiles.length) {
    currentTrackIndex = index;
    const track = audioFiles[currentTrackIndex];

    // Initialize Web Audio API context if not already done
    initAudioContext();

    // Get fresh metadata for the track
    ipcRenderer.invoke('extract-metadata', track.path)
      .then(metadata => {
        // Update the track's metadata
        audioFiles[currentTrackIndex].metadata = metadata;

        // Start playing the track
        audioElement.src = track.path;
        audioElement.load();
        return audioElement.play();
      })
      .then(() => {
        isPlaying = true;
        updatePlayPauseIcon();
        updateTrackInfo();

        // Show notification for track change
        showTrackChangeNotification();
      })
      .catch(error => {
        console.error('Error playing audio:', error);
        // Try to play anyway even if metadata extraction fails
        if (!audioElement.src) {
          audioElement.src = track.path;
          audioElement.load();
          audioElement.play()
            .then(() => {
              isPlaying = true;
              updatePlayPauseIcon();
              updateTrackInfo();

              // Show notification for track change
              showTrackChangeNotification();
            })
            .catch(playError => {
              console.error('Error playing audio after metadata failure:', playError);
            });
        }
      });
  }
}

function togglePlayPause() {
  if (audioFiles.length === 0) return;

  if (currentTrackIndex === -1) {
    // No track selected, play the first one
    playTrack(0);
  } else if (isPlaying) {
    audioElement.pause();
    isPlaying = false;
  } else {
    audioElement.play()
      .then(() => {
        isPlaying = true;
        updatePlayPauseIcon();
      })
      .catch(error => {
        console.error('Error playing audio:', error);
      });
    return; // Skip the updatePlayPauseIcon() call below for the play case
  }

  updatePlayPauseIcon();
}

function playPreviousTrack() {
  if (audioFiles.length === 0) return;

  // If we're more than 3 seconds into the song, restart it instead of going to previous
  if (audioElement.currentTime > 3) {
    audioElement.currentTime = 0;
    return;
  }

  let newIndex = currentTrackIndex - 1;
  if (newIndex < 0) {
    newIndex = audioFiles.length - 1; // Loop to the last track
  }

  playTrack(newIndex);
}

function playNextTrack() {
  if (audioFiles.length === 0) return;

  let newIndex = currentTrackIndex + 1;
  if (newIndex >= audioFiles.length) {
    newIndex = 0; // Loop to the first track
  }

  playTrack(newIndex);
}

function updateVolume() {
  audioElement.volume = volumeSlider.value / 100;
  // Save the volume state
  ipcRenderer.invoke('save-volume', volumeSlider.value);
}

function updateProgress() {
  const duration = audioElement.duration;
  const currentTime = audioElement.currentTime;

  if (duration) {
    // Update progress bar
    const progressPercent = (currentTime / duration) * 100;
    progressBar.style.width = `${progressPercent}%`;

    // Update time displays
    currentTimeDisplay.textContent = formatTime(currentTime);
    totalTimeDisplay.textContent = formatTime(duration);
  }
}

function seekTo(e) {
  const progressBar = document.querySelector('.progress-bar');
  const width = progressBar.clientWidth;
  const clickX = e.offsetX;
  const duration = audioElement.duration;

  audioElement.currentTime = (clickX / width) * duration;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

function updatePlayPauseIcon() {
  playPauseBtn.innerHTML = isPlaying
    ? '<i class="fas fa-pause"></i>'
    : '<i class="fas fa-play"></i>';
}

function updateTrackInfo() {
  if (currentTrackIndex !== -1 && audioFiles[currentTrackIndex]) {
    const track = audioFiles[currentTrackIndex];

    if (track.metadata) {
      // Use metadata if available
      const title = track.metadata.title;
      const artist = track.metadata.artist;

      trackNameDisplay.textContent = title;
      trackArtistDisplay.textContent = artist;

      // Fetch and display lyrics
      fetchAndDisplayLyrics(artist, title);

      // If we have duration metadata and the audio hasn't loaded yet, update the total time display
      if (track.metadata.duration && !audioElement.duration) {
        totalTimeDisplay.textContent = formatTime(track.metadata.duration);
      }

      // Display cover art if available
      if (track.metadata.coverArt) {
        trackArtDisplay.style.backgroundImage = `url(data:${track.metadata.coverArt.format};base64,${track.metadata.coverArt.data})`;
        trackArtDisplay.style.backgroundSize = 'cover';
        trackArtDisplay.style.backgroundPosition = 'center';
      } else {
        // Reset to default if no cover art
        trackArtDisplay.style.backgroundImage = 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffffff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/></svg>\')';
        trackArtDisplay.style.backgroundSize = '60%';
        trackArtDisplay.style.backgroundPosition = 'center';
        trackArtDisplay.style.backgroundRepeat = 'no-repeat';
      }
    } else {
      // Fall back to filename parsing if no metadata
      const fileName = path.basename(track.name, path.extname(track.name));

      // Try to extract artist and title from filename (assuming format: "Artist - Title.mp3")
      const parts = fileName.split(' - ');
      let title, artist;

      if (parts.length > 1) {
        title = parts[1];
        artist = parts[0];
        trackNameDisplay.textContent = title;
        trackArtistDisplay.textContent = artist;

        // Fetch and display lyrics
        fetchAndDisplayLyrics(artist, title);
      } else {
        title = fileName;
        artist = 'Unknown Artist';
        trackNameDisplay.textContent = title;
        trackArtistDisplay.textContent = artist;

        // Don't try to fetch lyrics for unknown artists
        lyricsContent.textContent = "Lyrics not available for this track";
      }

      // Reset to default if no metadata
      trackArtDisplay.style.backgroundImage = 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffffff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/></svg>\')';
      trackArtDisplay.style.backgroundSize = '60%';
      trackArtDisplay.style.backgroundPosition = 'center';
      trackArtDisplay.style.backgroundRepeat = 'no-repeat';
    }
  } else {
    trackNameDisplay.textContent = 'Select a track';
    trackArtistDisplay.textContent = '-';
    lyricsContent.textContent = "Select a track to view lyrics";

    // Reset to default if no track selected
    trackArtDisplay.style.backgroundImage = 'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffffff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/></svg>\')';
    trackArtDisplay.style.backgroundSize = '60%';
    trackArtDisplay.style.backgroundPosition = 'center';
    trackArtDisplay.style.backgroundRepeat = 'no-repeat';
  }
}

// Notification function for track changes
function showTrackChangeNotification() {
  if (currentTrackIndex !== -1 && audioFiles[currentTrackIndex]) {
    const track = audioFiles[currentTrackIndex];
    let title = 'Unknown Title';
    let artist = 'Unknown Artist';

    if (track.metadata) {
      // Use metadata if available
      title = track.metadata.title || path.basename(track.name, path.extname(track.name));
      artist = track.metadata.artist || 'Unknown Artist';
    } else {
      // Fall back to filename parsing if no metadata
      const fileName = path.basename(track.name, path.extname(track.name));

      // Try to extract artist and title from filename (assuming format: "Artist - Title.mp3")
      const parts = fileName.split(' - ');
      if (parts.length > 1) {
        title = parts[1];
        artist = parts[0];
      } else {
        title = fileName;
      }
    }

    // Create and show the notification
    if ('Notification' in window) {
      // Check if permission is already granted
      if (Notification.permission === 'granted') {
        createNotification(title, artist);
      }
      // Check if permission needs to be requested
      else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            createNotification(title, artist);
          }
        });
      }
    }
  }
}

// Helper function to create the notification
function createNotification(title, artist) {
  const notification = new Notification('Now Playing', {
    body: `${title} by ${artist}`,
    icon: trackArtDisplay.style.backgroundImage ? trackArtDisplay.style.backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/i, '$1') : null,
    silent: false
  });

  // Auto close after 5 seconds
  setTimeout(() => notification.close(), 5000);

  // Handle click on notification
  notification.onclick = () => {
    // Focus the app window when notification is clicked
    window.focus();
  };
}

// Theme functions
function setTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
    themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    document.body.classList.remove('dark-theme');
    themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
  }
}

async function toggleTheme() {
  const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  setTheme(newTheme);

  // Save the theme preference
  await ipcRenderer.invoke('save-theme', newTheme);
}
