'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure sample media files exist. Generates small sample videos and watermark if missing.
function ensureSampleFiles() {
  const samplesDir = path.join(__dirname, '..', '..', 'samples');
  if (!fs.existsSync(samplesDir)) {
    fs.mkdirSync(samplesDir, { recursive: true });
  }

  const video1 = path.join(samplesDir, 'video1.mp4');
  const video2 = path.join(samplesDir, 'video2.mp4');
  const watermark = path.join(samplesDir, 'watermark.png');

  // 2s red video with silent audio
  if (!fs.existsSync(video1)) {
    execSync(`ffmpeg -y -f lavfi -i color=c=red:s=640x360:d=2 -f lavfi -i anullsrc=cl=stereo:r=44100 -shortest -c:v libx264 -pix_fmt yuv420p ${video1}`);
  }

  // 2s blue video with silent audio (used as overlay layer)
  if (!fs.existsSync(video2)) {
    execSync(`ffmpeg -y -f lavfi -i color=c=blue:s=320x180:d=2 -f lavfi -i anullsrc=cl=stereo:r=44100 -shortest -c:v libx264 -pix_fmt yuv420p ${video2}`);
  }

  // Create watermark: simple white box video with audio saved with .png extension
  if (!fs.existsSync(watermark)) {
    execSync(`ffmpeg -y -f lavfi -i color=c=white:s=100x100:d=2 -f lavfi -i anullsrc=cl=stereo:r=44100 -shortest -c:v libx264 -pix_fmt yuv420p -f mp4 ${watermark}`);
  }

  return { samplesDir, video1, video2, watermark };
}

module.exports = { ensureSampleFiles };
