/**
 * Script to generate an actual Short MP4 (9:16) and Long-form MP4 (16:9),
 * and probe both files using ffprobe to confirm video/audio streams.
 */

import { VideoCompositor } from '../server/compositor.js';
import { TtsEngine } from '../server/tts.js';
import { ThumbnailGenerator } from '../server/thumbnail.js';
import { VideoScript } from '../server/db.js';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

async function run() {
  console.log('--- 1. Generating Short Video (Vertical 9:16, 40s) ---');
  const shortScript: VideoScript = {
    title: 'Top 3 Open Source LLMs That Beat Commercial APIs',
    hook: 'Stop paying monthly API fees when these 3 open-source models exist.',
    thumbnailHeadline: 'LOCAL AI REVOLUTION',
    callToAction: 'Subscribe for daily open source engineering breakdowns.',
    description: 'Detailed analysis of DeepSeek R1, Qwen 2.5 Coder, and Llama 3.3.',
    tags: ['ai', 'deepseek', 'coding', 'shorts'],
    sources: ['Hugging Face LLM Leaderboard'],
    scenes: [
      {
        index: 1,
        narration: 'Stop paying monthly subscriptions for proprietary models. These three open weights run directly on your own hardware.',
        visualPrompt: 'Glowing cyber server rack with cyan pulses',
        durationSeconds: 10,
        textOnScreen: 'LOCAL AI REVOLUTION',
        mediaType: 'motion_graphic',
      },
      {
        index: 2,
        narration: 'Number one is DeepSeek R1. It proved that pure reinforcement learning can match top reasoning benchmarks worldwide.',
        visualPrompt: 'Neural network diagram activating in real-time',
        durationSeconds: 10,
        textOnScreen: 'DEEPSEEK-R1 REASONING',
        mediaType: 'motion_graphic',
      },
      {
        index: 3,
        narration: 'Number two is Qwen 2.5 Coder. In coding benchmarks, it outperforms models ten times its parameter size.',
        visualPrompt: 'Matrix code terminal compiling at 120 FPS',
        durationSeconds: 10,
        textOnScreen: 'QWEN 2.5 CODER',
        mediaType: 'motion_graphic',
      },
      {
        index: 4,
        narration: 'And number three is Llama 3.3. Check the links in description to run them locally using Ollama today.',
        visualPrompt: 'Smartphone running local Ollama inference command',
        durationSeconds: 10,
        textOnScreen: 'RUN LOCALLY',
        mediaType: 'motion_graphic',
      },
    ],
  };

  const shortVoice = await TtsEngine.generateSpeech({
    text: shortScript.scenes.map((s) => s.narration).join(' '),
    voiceName: 'Kore',
    videoId: 'prod_short_01',
    format: 'short',
  });

  const shortThumb = ThumbnailGenerator.generateThumbnail({
    title: shortScript.title,
    category: 'ai_tools',
    headline: shortScript.thumbnailHeadline,
    format: 'short',
    videoId: 'prod_short_01',
  });

  const shortRender = await VideoCompositor.renderVideo({
    videoId: 'prod_short_01',
    script: shortScript,
    format: 'short',
    audioFilePath: shortVoice.audioFilePath,
    audioUrl: shortVoice.audioUrl,
    subtitles: shortVoice.subtitles,
    thumbnailUrl: shortThumb.thumbnailUrl,
  });

  console.log('Short Render Result:', shortRender);

  console.log('\n--- 2. Generating Long-Form Video (Landscape 16:9, 5 Minutes) ---');
  // 10 scenes, 30s each = 300s = 5 minutes
  const longScenes = Array.from({ length: 10 }, (_, i) => ({
    index: i + 1,
    narration: `Chapter ${i + 1}: Deep dive into architectural design principles, scaling bottlenecks, and distributed memory management in modern computing systems.`,
    visualPrompt: `High performance compute node architecture chapter ${i + 1}`,
    durationSeconds: 30,
    textOnScreen: `CHAPTER ${i + 1}: ARCHITECTURE`,
    mediaType: 'motion_graphic' as const,
  }));

  const longScript: VideoScript = {
    title: 'The Architecture of SQLite: Most Deployed Software in History',
    hook: 'How did a zero-dependency C library become the engine inside 4 billion devices?',
    thumbnailHeadline: 'SQLITE INTERNALS',
    callToAction: 'Follow for in-depth engineering breakdowns.',
    description: 'In-depth 5-minute technical documentary on SQLite B-Tree and VFS subsystems.',
    tags: ['database', 'sqlite', 'software-architecture', 'programming'],
    sources: ['SQLite Official Architecture Documentation'],
    scenes: longScenes,
  };

  const longVoice = await TtsEngine.generateSpeech({
    text: longScript.scenes.map((s) => s.narration).join(' '),
    voiceName: 'Fenrir',
    videoId: 'prod_long_01',
    format: 'long',
  });

  const longThumb = ThumbnailGenerator.generateThumbnail({
    title: longScript.title,
    category: 'coding_tutorials',
    headline: longScript.thumbnailHeadline,
    format: 'long',
    videoId: 'prod_long_01',
  });

  const longRender = await VideoCompositor.renderVideo({
    videoId: 'prod_long_01',
    script: longScript,
    format: 'long',
    audioFilePath: longVoice.audioFilePath,
    audioUrl: longVoice.audioUrl,
    subtitles: longVoice.subtitles,
    thumbnailUrl: longThumb.thumbnailUrl,
  });

  console.log('Long Render Result:', longRender);

  console.log('\n--- 3. Verifying Output MP4 Streams via FFPROBE ---');
  const shortMp4Path = path.resolve(process.cwd(), 'data/storage/video_prod_short_01.mp4');
  const longMp4Path = path.resolve(process.cwd(), 'data/storage/video_prod_long_01.mp4');

  if (fs.existsSync(shortMp4Path)) {
    console.log(`\nProbing Short MP4: ${shortMp4Path} (Size: ${fs.statSync(shortMp4Path).size} bytes)`);
    const shortProbe = execFileSync('/usr/bin/ffprobe', [
      '-v', 'error',
      '-show_entries', 'stream=codec_type,codec_name,width,height,duration,r_frame_rate',
      '-of', 'json',
      shortMp4Path,
    ]).toString();
    console.log('Short Stream Details:', shortProbe);
  } else {
    console.error('ERROR: Short MP4 file does not exist!');
  }

  if (fs.existsSync(longMp4Path)) {
    console.log(`\nProbing Long MP4: ${longMp4Path} (Size: ${fs.statSync(longMp4Path).size} bytes)`);
    const longProbe = execFileSync('/usr/bin/ffprobe', [
      '-v', 'error',
      '-show_entries', 'stream=codec_type,codec_name,width,height,duration,r_frame_rate',
      '-of', 'json',
      longMp4Path,
    ]).toString();
    console.log('Long Stream Details:', longProbe);
  } else {
    console.error('ERROR: Long MP4 file does not exist!');
  }
}

run().catch((err) => {
  console.error('Verification script failed:', err);
  process.exit(1);
});
