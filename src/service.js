const mm = require('music-metadata');
const path = require('path');
const axios = require('axios');

// Extract metadata from audio file
async function extractAudioMetadata(filePath) {
  try {
    const metadata = await mm.parseFile(filePath);

    // Extract cover art if available
    let coverArt = null;
    if (metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0];
      coverArt = {
        format: picture.format,
        data: picture.data.toString('base64')
      };
    }

    return {
      title: metadata.common.title || path.basename(filePath, path.extname(filePath)),
      artist: metadata.common.artist || 'Unknown Artist',
      album: metadata.common.album || 'Unknown Album',
      year: metadata.common.year || '',
      genre: metadata.common.genre ? metadata.common.genre[0] : '',
      duration: metadata.format.duration || 0,
      bitrate: metadata.format.bitrate || 0,
      sampleRate: metadata.format.sampleRate || 0,
      channels: metadata.format.numberOfChannels || 0,
      coverArt: coverArt
    };
  } catch (error) {
    console.error(`Error extracting metadata from ${filePath}:`, error);
    return {
      title: path.basename(filePath, path.extname(filePath)),
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      year: '',
      genre: '',
      duration: 0,
      bitrate: 0,
      sampleRate: 0,
      channels: 0,
      coverArt: null
    };
  }
}

// Fetch lyrics for a song
async function fetchLyrics(artist, title) {
  try {
    // Use LyricsOVH API to fetch lyrics
    const response = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    return response.data.lyrics;
  } catch (error) {
    console.error(`Error fetching lyrics for ${artist} - ${title}:`, error);
    return "Lyrics not found";
  }
}

module.exports = {
  extractAudioMetadata,
  fetchLyrics
};