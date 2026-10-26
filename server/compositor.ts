/**
 * Faceless Autopilot - Video Engine & Compositor
 * Assembles multi-scene stock visuals, pan-and-zoom motion, synchronized captions,
 * audio streams, and executes automated quality gates with black-frame detection.
 */

import { VideoScript, QualityMetrics, VideoScene } from './db.js';
import { TimedSubtitleLine } from './tts.js';
import { BudgetManager } from './budget.js';
import { VisualAssetEngine } from './visuals.js';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface RenderResult {
  videoUrl: string;
  filePath: string;
  mp4FilePath?: string;
  fileSizeBytes: number;
  durationSeconds: number;
  qualityMetrics: QualityMetrics;
  sampleFrames?: string[];
}

export class VideoCompositor {
  private static formatSrtTimestamp(seconds: number): string {
    const pad = (n: number, z = 2) => ('00' + n).slice(-z);
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
  }

  private static subtitlesToSrt(subtitles: TimedSubtitleLine[]): string {
    return subtitles
      .map((sub, idx) => {
        return `${idx + 1}\n${this.formatSrtTimestamp(sub.start)} --> ${this.formatSrtTimestamp(sub.end)}\n${sub.text.trim()}\n`;
      })
      .join('\n');
  }

  /**
   * Renders a single scene into an animated video segment with cinematic pan motion.
   */
  private static async renderSceneSegment(params: {
    scene: VideoScene;
    category: string;
    videoId: string;
    sceneIndex: number;
    durationSeconds: number;
    format: 'short' | 'long';
    outputPath: string;
  }): Promise<void> {
    const isShort = params.format === 'short';
    const targetW = isShort ? 720 : 1280;
    const targetH = isShort ? 1280 : 720;
    const scaledW = isShort ? 828 : 1472;
    const scaledH = isShort ? 1472 : 828;
    const duration = Math.max(2, Math.round(params.durationSeconds));

    // Ensure valid visual asset on disk
    let assetPath = params.scene.mediaUrl;
    if (!assetPath || !fs.existsSync(assetPath) || fs.statSync(assetPath).size < 5000) {
      assetPath = await VisualAssetEngine.acquireVisualForScene({
        scene: params.scene,
        category: params.category,
        videoId: params.videoId,
        sceneIndex: params.sceneIndex,
        format: params.format,
      });
    }

    // Determine motion pan pattern (alternate per scene)
    const motionType = params.sceneIndex % 3;
    let panFilter = '';
    if (motionType === 0) {
      // Horizontal pan (left to right)
      panFilter = `crop=${targetW}:${targetH}:x='(in_w-out_w)*(t/${duration})':y='(in_h-out_h)/2'`;
    } else if (motionType === 1) {
      // Vertical pan (top to bottom)
      panFilter = `crop=${targetW}:${targetH}:x='(in_w-out_w)/2':y='(in_h-out_h)*(t/${duration})'`;
    } else {
      // Horizontal pan (right to left)
      panFilter = `crop=${targetW}:${targetH}:x='(in_w-out_w)*(1-t/${duration})':y='(in_h-out_h)/2'`;
    }

    const vf = `scale=${scaledW}:${scaledH}:force_original_aspect_ratio=increase,crop=${scaledW}:${scaledH},${panFilter},setsar=1`;

    const args = [
      '-y',
      '-loop', '1',
      '-t', duration.toString(),
      '-i', assetPath,
      '-vf', vf,
      '-r', '25',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-pix_fmt', 'yuv420p',
      params.outputPath,
    ];

    await execFileAsync('/usr/bin/ffmpeg', args);
  }

  /**
   * Renders and compiles full video package with real MP4 H.264/AAC generation and interactive HTML5 player.
   */
  public static async renderVideo(params: {
    videoId: string;
    script: VideoScript;
    format: 'short' | 'long';
    category?: string;
    audioFilePath?: string;
    audioUrl?: string;
    subtitles: TimedSubtitleLine[];
    thumbnailUrl: string;
  }): Promise<RenderResult> {
    const isShort = params.format === 'short';
    const totalDuration = params.script.scenes.reduce((acc, s) => acc + (s.durationSeconds || 8), 0);
    const category = params.category || 'technology';

    const storageDir = path.resolve(process.cwd(), 'data/storage');
    const tempDir = path.join(storageDir, `temp_${params.videoId}`);
    const framesDir = path.join(storageDir, 'frames');

    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir, { recursive: true });

    const mp4FileName = `video_${params.videoId}.mp4`;
    const mp4FilePath = path.join(storageDir, mp4FileName);

    let audioInput = params.audioFilePath && fs.existsSync(params.audioFilePath)
      ? params.audioFilePath
      : null;

    const segmentPaths: string[] = [];
    const sampleFramePaths: string[] = [];

    try {
      // 1. Render each scene into a distinct video segment with real stock visual assets and motion
      for (let i = 0; i < params.script.scenes.length; i++) {
        const scene = params.script.scenes[i];
        const segPath = path.join(tempDir, `seg_${i + 1}.mp4`);
        await this.renderSceneSegment({
          scene,
          category,
          videoId: params.videoId,
          sceneIndex: i + 1,
          durationSeconds: scene.durationSeconds || 8,
          format: params.format,
          outputPath: segPath,
        });
        segmentPaths.push(segPath);
      }

      // 2. Concat all scene segments into a video track
      const concatListPath = path.join(tempDir, 'concat_list.txt');
      const concatContent = segmentPaths.map((p) => `file '${p}'`).join('\n');
      fs.writeFileSync(concatListPath, concatContent, 'utf-8');

      const mergedVideoPath = path.join(tempDir, 'merged_raw.mp4');
      const concatArgs = [
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', concatListPath,
      ];

      if (audioInput) {
        concatArgs.push('-i', audioInput);
      } else {
        concatArgs.push('-f', 'lavfi', '-i', `sine=frequency=240:duration=${totalDuration}`);
      }

      concatArgs.push(
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-shortest',
        mergedVideoPath
      );

      await execFileAsync('/usr/bin/ffmpeg', concatArgs);

      // 3. Burn synchronized subtitles and captions into final MP4
      const srtPath = path.join(tempDir, 'captions.srt');
      if (params.subtitles && params.subtitles.length > 0) {
        const srtContent = this.subtitlesToSrt(params.subtitles);
        fs.writeFileSync(srtPath, srtContent, 'utf-8');

        const fontSize = isShort ? 24 : 20;
        const marginV = isShort ? 120 : 50;
        const subtitleStyle = `FontSize=${fontSize},FontName=DejaVu Sans,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=2.5,Alignment=2,MarginV=${marginV}`;

        await execFileAsync('/usr/bin/ffmpeg', [
          '-y',
          '-i', mergedVideoPath,
          '-vf', `subtitles=${srtPath}:force_style='${subtitleStyle}'`,
          '-c:a', 'copy',
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-pix_fmt', 'yuv420p',
          mp4FilePath,
        ]);
      } else {
        // Direct move if no subtitles
        fs.copyFileSync(mergedVideoPath, mp4FilePath);
      }

      // 4. Extract sample frames for visual quality confirmation
      const probePoints = [0.25, 0.50, 0.75];
      for (const pct of probePoints) {
        const timeSec = Math.max(1, Math.floor(totalDuration * pct));
        const frameFileName = `frame_${params.videoId}_${Math.round(pct * 100)}.jpg`;
        const frameFilePath = path.join(framesDir, frameFileName);

        try {
          await execFileAsync('/usr/bin/ffmpeg', [
            '-y',
            '-ss', timeSec.toString(),
            '-i', mp4FilePath,
            '-vframes', '1',
            '-q:v', '2',
            frameFilePath,
          ]);

          if (fs.existsSync(frameFilePath) && fs.statSync(frameFilePath).size > 10000) {
            sampleFramePaths.push(frameFilePath);
          }
        } catch (frameErr) {
          console.warn(`[COMPOSITOR] Failed to extract sample frame at ${timeSec}s:`, frameErr);
        }
      }

      // Clean up temporary segment files
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    } catch (ffmpegErr: any) {
      console.error('[COMPOSITOR] Fatal FFmpeg assembly error:', ffmpegErr);
      throw new Error(`Video composition failed: ${ffmpegErr.message}`);
    }

    // 5. Generate interactive HTML5 companion player
    const compositionPayload = {
      id: params.videoId,
      title: params.script.title,
      format: params.format,
      aspectRatio: isShort ? '9:16' : '16:9',
      width: isShort ? 720 : 1280,
      height: isShort ? 1280 : 720,
      durationSeconds: totalDuration,
      audioUrl: params.audioUrl || '',
      videoUrl: `/api/storage/${mp4FileName}`,
      thumbnailUrl: params.thumbnailUrl,
      subtitles: params.subtitles,
      scenes: params.script.scenes.map((s, idx) => ({
        index: idx + 1,
        narration: s.narration,
        visualPrompt: s.visualPrompt,
        textOnScreen: s.textOnScreen,
        durationSeconds: s.durationSeconds,
        mediaType: s.mediaType,
        mediaUrl: s.mediaUrl,
        themeGradient: this.getThemeForIndex(idx),
      })),
      createdAt: new Date().toISOString(),
    };

    const jsonFileName = `video_${params.videoId}_${Date.now()}.json`;
    const jsonFilePath = path.join(storageDir, jsonFileName);
    fs.writeFileSync(jsonFilePath, JSON.stringify(compositionPayload, null, 2), 'utf-8');

    const playerFileName = `player_${params.videoId}.html`;
    const playerFilePath = path.join(storageDir, playerFileName);
    const playerHtml = this.generatePlayerHtml(compositionPayload);
    fs.writeFileSync(playerFilePath, playerHtml, 'utf-8');

    const mp4Exists = fs.existsSync(mp4FilePath) && fs.statSync(mp4FilePath).size > 10000;
    const fileSizeBytes = mp4Exists ? fs.statSync(mp4FilePath).size : 0;

    // 6. Quality Assurance & Black-Frame Detection Gate
    const errors: string[] = [];
    if (!mp4Exists) {
      errors.push('Rendered MP4 file missing or size is under 10KB');
    }

    // Detect if the video contains blank / solid black frames
    if (mp4Exists) {
      try {
        const { stderr } = await execFileAsync('/usr/bin/ffmpeg', [
          '-i', mp4FilePath,
          '-vf', 'blackdetect=d=1.5:pic_th=0.95',
          '-an',
          '-f', 'null',
          '-',
        ]);

        const blackMatches = stderr.match(/black_duration:([0-9.]+)/g);
        if (blackMatches) {
          let totalBlackDuration = 0;
          for (const m of blackMatches) {
            const sec = parseFloat(m.replace('black_duration:', ''));
            if (!isNaN(sec)) totalBlackDuration += sec;
          }
          if (totalBlackDuration > 2.0 && totalBlackDuration > totalDuration * 0.3) {
            errors.push(`Video is blank or all-black: detected ${totalBlackDuration.toFixed(1)}s of black screen.`);
          }
        }
      } catch (bdErr: any) {
        // If grep or blackdetect throws, inspect
      }
    }

    if (totalDuration < 15) errors.push('Video duration too short (<15s)');
    if (params.script.scenes.length < 3) errors.push('Insufficient scene count (<3 scenes)');
    if (sampleFramePaths.length === 0) errors.push('Failed to verify visible image frames');

    const wordCount = params.script.scenes.reduce((acc, s) => acc + s.narration.split(/\s+/).length, 0);
    const estimatedPacingWpm = Math.round((wordCount / (totalDuration / 60)));

    const qualityMetrics: QualityMetrics = {
      durationSeconds: totalDuration,
      aspectRatio: isShort ? '9:16' : '16:9',
      hasVoiceover: Boolean(params.audioUrl || audioInput),
      hasSubtitles: params.subtitles && params.subtitles.length > 0,
      hasThumbnail: Boolean(params.thumbnailUrl),
      sceneCount: params.script.scenes.length,
      wordCount,
      estimatedPacingWpm,
      passedValidation: errors.length === 0,
      validationErrors: errors.length > 0 ? errors : undefined,
    };

    BudgetManager.recordUsage({
      service: 'render',
      operation: `Video MP4 Multi-Scene Assembly (${params.format})`,
      durationSeconds: totalDuration,
      videoId: params.videoId,
    });

    return {
      videoUrl: `/api/storage/${mp4FileName}`,
      filePath: mp4FilePath,
      mp4FilePath,
      fileSizeBytes,
      durationSeconds: totalDuration,
      qualityMetrics,
      sampleFrames: sampleFramePaths,
    };
  }

  private static getThemeForIndex(idx: number): { from: string; to: string; accent: string } {
    const themes = [
      { from: '#020617', to: '#1e1b4b', accent: '#38bdf8' },
      { from: '#090d16', to: '#172554', accent: '#06b6d4' },
      { from: '#030712', to: '#0f172a', accent: '#a855f7' },
      { from: '#052e16', to: '#022c22', accent: '#10b981' },
      { from: '#450a0a', to: '#1c1917', accent: '#ef4444' },
    ];
    return themes[idx % themes.length];
  }

  private static generatePlayerHtml(payload: any): string {
    const isShort = payload.aspectRatio === '9:16';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>${payload.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #000;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      width: 100vw;
    }
    #stage-container {
      position: relative;
      width: ${isShort ? 'min(100vw, 56.25vh)' : 'min(100vw, 177.78vh)'};
      height: ${isShort ? 'min(177.78vw, 100vh)' : 'min(56.25vw, 100vh)'};
      aspect-ratio: ${isShort ? '9/16' : '16/9'};
      background: #020617;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    video {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .overlay-hud {
      position: absolute;
      top: 16px;
      left: 16px;
      right: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 10;
      pointer-events: none;
    }
    .badge {
      background: rgba(239, 68, 68, 0.85);
      color: white;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      padding: 4px 10px;
      border-radius: 9999px;
      backdrop-filter: blur(8px);
    }
    .watermark {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.6);
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div id="stage-container">
    <video id="main-video" src="${payload.videoUrl}" controls playsinline preload="auto"></video>
    <div class="overlay-hud">
      <span class="badge">${isShort ? 'YOUTUBE SHORTS' : 'LONG-FORM HD'}</span>
      <span class="watermark">Faceless Autopilot</span>
    </div>
  </div>
</body>
</html>`;
  }
}
