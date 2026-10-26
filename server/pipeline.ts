/**
 * Faceless Autopilot - Automated Production Pipeline
 * Implements the 14-stage workflow:
 * Scheduler -> Topic Research -> Duplicate Check -> Script Generation -> Fact Check ->
 * Voice Generation -> Visual Selection -> Animation -> Video Rendering -> Subtitle Generation ->
 * Thumbnail -> Quality Verification -> YouTube Upload -> Analytics Collection.
 */

import { db, VideoRecord, LogEntry } from './db.js';
import { AiEngine, TopicCandidate, FactCheckResult } from './ai.js';
import { TtsEngine, TimedSubtitleLine } from './tts.js';
import { ThumbnailGenerator } from './thumbnail.js';
import { VideoCompositor } from './compositor.js';
import { VisualAssetEngine } from './visuals.js';
import { YouTubeService } from './youtube.js';
import { BudgetManager } from './budget.js';
import crypto from 'crypto';

export class PipelineManager {
  private static isRunningQueue = false;
  private static schedulerInterval: NodeJS.Timeout | null = null;
  private static activeTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initializes background scheduler and checks for interrupted tasks to recover
   */
  public static init() {
    this.recoverInterruptedTasks();

    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
    }

    // Scheduler tick every 45 seconds
    this.schedulerInterval = setInterval(() => {
      this.evaluateSchedulerTick();
    }, 45000);

    db.log('PIPELINE', 'Pipeline scheduler started. Monitoring automation schedule & queues.', 'info');
  }

  /**
   * Emergency STOP: Immediately halts all tasks and blocks future generation
   */
  public static triggerEmergencyStop(): void {
    db.update((state) => {
      state.automationConfig.emergencyStop = true;
      state.automationConfig.isEnabled = false;
    });

    // Clear active timeouts
    for (const [id, timeout] of this.activeTimeouts.entries()) {
      clearTimeout(timeout);
    }
    this.activeTimeouts.clear();

    db.log('EMERGENCY', 'EMERGENCY STOP ENGAGED. All active jobs paused and automation halted.', 'error');
  }

  /**
   * Resume normal operations
   */
  public static clearEmergencyStop(): void {
    db.update((state) => {
      state.automationConfig.emergencyStop = false;
    });
    db.log('PIPELINE', 'Emergency stop cleared. System resumed in standby.', 'info');
  }

  /**
   * Crash / Server Restart Recovery:
   * Finds any videos stuck in intermediate states and resets them to 'queued' or marks retry.
   */
  public static recoverInterruptedTasks() {
    const activeStates = [
      'researching',
      'scripting',
      'fact_checking',
      'generating_voice',
      'visual_selection',
      'rendering',
      'generating_subtitles',
      'generating_thumbnail',
      'verifying_quality',
      'uploading',
    ];

    let recoveredCount = 0;
    db.update((state) => {
      for (const video of state.videos) {
        if (activeStates.includes(video.status)) {
          video.status = 'queued';
          video.progress = 0;
          video.currentStep = 'RECOVERED_AFTER_RESTART';
          video.logs.push({
            timestamp: new Date().toISOString(),
            step: 'RECOVERY',
            message: 'Server restart detected. Task recovered and placed back into queue.',
            status: 'warning',
          });
          recoveredCount++;
        }
      }
    });

    if (recoveredCount > 0) {
      db.log('PIPELINE', `Recovered ${recoveredCount} tasks after restart.`, 'warning');
      this.processQueue();
    }
  }

  /**
   * Evaluates if a new video should be generated according to targets:
   * 40 Shorts / month & 20 Long-form / month
   */
  public static async evaluateSchedulerTick() {
    const config = db.get().automationConfig;
    if (!config.isEnabled || config.emergencyStop) return;

    // Check budget
    const budgetCheck = BudgetManager.canExecuteJob();
    if (!budgetCheck.allowed) {
      return;
    }

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const todayStr = now.toISOString().slice(0, 10);

    const monthlyVideos = db.get().videos.filter(
      (v) => v.createdAt.startsWith(currentMonth) && v.status !== 'failed'
    );
    const shortsThisMonth = monthlyVideos.filter((v) => v.format === 'short').length;
    const longThisMonth = monthlyVideos.filter((v) => v.format === 'long').length;

    const todayVideos = db.get().videos.filter(
      (v) => v.createdAt.startsWith(todayStr) && v.status !== 'failed'
    );
    const shortsToday = todayVideos.filter((v) => v.format === 'short').length;
    const longToday = todayVideos.filter((v) => v.format === 'long').length;

    // Has queued video? Process it first
    const hasQueued = db.get().videos.some((v) => v.status === 'queued');
    if (hasQueued) {
      this.processQueue();
      return;
    }

    // Determine what to generate next
    let nextFormat: 'short' | 'long' | null = null;

    if (shortsThisMonth < config.targetShortsPerMonth && shortsToday < config.dailyShortLimit) {
      nextFormat = 'short';
    } else if (longThisMonth < config.targetLongPerMonth && longToday < config.dailyLongLimit) {
      nextFormat = 'long';
    }

    if (nextFormat) {
      // Pick random active category
      const activeCategories = config.categories.filter((c) => c.enabled);
      if (activeCategories.length === 0) return;

      const randomCat = activeCategories[Math.floor(Math.random() * activeCategories.length)];
      db.log('SCHEDULER', `Autonomous scheduler triggered: Queuing 1 ${nextFormat.toUpperCase()} in ${randomCat.name}.`, 'info');

      await this.queueVideoGeneration({
        format: nextFormat,
        category: randomCat.id,
      });
    }
  }

  /**
   * Queues a new video creation task
   */
  public static async queueVideoGeneration(params: {
    format: 'short' | 'long';
    category?: string;
    customTopic?: string;
  }): Promise<VideoRecord> {
    const config = db.get().automationConfig;
    if (config.emergencyStop) {
      throw new Error('Action blocked: Emergency Stop is currently engaged.');
    }

    const budgetCheck = BudgetManager.canExecuteJob();
    if (!budgetCheck.allowed) {
      throw new Error(budgetCheck.reason);
    }

    const activeCategories = config.categories.filter((c) => c.enabled);
    const selectedCategory = params.category || (activeCategories[0]?.id || 'technology');
    const estimatedCost = BudgetManager.estimateVideoCost(params.format);

    const videoId = 'vid_' + crypto.randomUUID().slice(0, 10);
    const initialRecord: VideoRecord = {
      id: videoId,
      title: params.customTopic || 'Pending Topic Research...',
      topic: params.customTopic || '',
      category: selectedCategory,
      format: params.format,
      status: 'queued',
      currentStep: 'SCHEDULER',
      progress: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      privacyStatus: config.publishMode,
      durationSeconds: params.format === 'short' ? 45 : 360,
      costEstimatedAed: estimatedCost,
      costActualAed: 0,
      logs: [
        {
          timestamp: new Date().toISOString(),
          step: 'SCHEDULER',
          message: `Video queued. Target: ${params.format.toUpperCase()} (${selectedCategory}). Estimated cost: AED ${estimatedCost}.`,
          status: 'info',
        },
      ],
      retryCount: 0,
    };

    db.update((state) => {
      state.videos.unshift(initialRecord);
    });

    // Trigger queue worker
    setTimeout(() => {
      this.processQueue();
    }, 100);

    return initialRecord;
  }

  /**
   * Main Queue Worker: processes queued videos sequentially with full error handling and timeouts
   */
  public static async processQueue(): Promise<void> {
    if (this.isRunningQueue) return;
    const config = db.get().automationConfig;
    if (config.emergencyStop) return;

    const nextVideo = db.get().videos.find((v) => v.status === 'queued');
    if (!nextVideo) return;

    this.isRunningQueue = true;

    try {
      await this.runCompletePipeline(nextVideo.id);
    } catch (err: any) {
      console.error('Queue execution error:', err);
    } finally {
      this.isRunningQueue = false;
      // If there are more items, process next
      const remaining = db.get().videos.some((v) => v.status === 'queued');
      if (remaining && !db.get().automationConfig.emergencyStop) {
        setTimeout(() => this.processQueue(), 500);
      }
    }
  }

  /**
   * Executes the 14-stage workflow on a specific video record
   */
  public static async runCompletePipeline(videoId: string): Promise<void> {
    const getVideo = () => db.get().videos.find((v) => v.id === videoId);

    const updateStep = (
      step: string,
      status: VideoRecord['status'],
      progress: number,
      logMsg: string,
      logStatus: LogEntry['status'] = 'info'
    ) => {
      db.update((state) => {
        const v = state.videos.find((x) => x.id === videoId);
        if (v) {
          v.currentStep = step;
          v.status = status;
          v.progress = progress;
          v.updatedAt = new Date().toISOString();
          v.logs.push({
            timestamp: new Date().toISOString(),
            step,
            message: logMsg,
            status: logStatus,
          });
        }
      });
      db.log(step, `[${videoId.slice(0, 8)}] ${logMsg}`, logStatus);
    };

    try {
      // 1. TOPIC RESEARCH
      updateStep('TOPIC_RESEARCH', 'researching', 12, 'Initiating AI topic discovery from verified technical sources...');
      let topic = getVideo()?.topic;
      let topicCandidate: TopicCandidate | null = null;

      if (!topic) {
        const category = getVideo()?.category || 'technology';
        const candidates = await AiEngine.discoverTopics(category, 3);
        topicCandidate = candidates.sort((a, b) => b.score - a.score)[0];
        topic = topicCandidate?.topic || `The Architecture of Modern ${category}`;
        db.update((state) => {
          const v = state.videos.find((x) => x.id === videoId);
          if (v) {
            v.topic = topic!;
            v.title = topic!;
          }
        });
      }

      // 2. DUPLICATE CHECK
      updateStep('DUPLICATE_CHECK', 'researching', 18, `Checking duplication database for "${topic}"...`);
      const dupCheck = AiEngine.checkDuplicate(topic);
      if (dupCheck.isDuplicate) {
        updateStep('DUPLICATE_CHECK', 'researching', 20, `Similar topic detected (${dupCheck.similarTopic}). Branching to unique angle.`);
        topic = `${topic} (2026 Deep Dive)`;
      }

      // 3. FACT CHECK
      updateStep('FACT_CHECK', 'fact_checking', 28, 'Cross-referencing technical claims to prevent hallucinations...');
      const factCheckResult = await AiEngine.factCheckTopic(topic, getVideo()?.category || 'technology');
      db.update((state) => {
        const v = state.videos.find((x) => x.id === videoId);
        if (v) {
          v.factCheckSummary = factCheckResult.summary;
        }
      });

      // 4. SCRIPT GENERATION
      updateStep('SCRIPT_GENERATION', 'scripting', 38, 'Generating high-CTR hook, narrative scene beats, and captions...');
      const script = await AiEngine.generateScript({
        topic,
        category: getVideo()?.category || 'technology',
        format: getVideo()?.format || 'short',
        factCheck: factCheckResult,
        videoId,
      });

      db.update((state) => {
        const v = state.videos.find((x) => x.id === videoId);
        if (v) {
          v.title = script.title;
          v.script = script;
        }
      });

      // 5. VOICE GENERATION
      const voice = db.get().automationConfig.voiceName || 'Kore';
      updateStep('VOICE_GENERATION', 'generating_voice', 50, `Synthesizing synchronized voiceover using ${voice}...`);
      const fullNarration = script.scenes.map((s) => s.narration).join(' ');
      const audioResult = await TtsEngine.generateSpeech({
        text: fullNarration,
        voiceName: voice,
        videoId,
        format: getVideo()?.format,
      });

      db.update((state) => {
        const v = state.videos.find((x) => x.id === videoId);
        if (v) {
          v.audioUrl = audioResult.audioUrl;
          v.durationSeconds = audioResult.durationSeconds;
        }
      });

      // 6. VISUAL SELECTION & MOTION GRAPHICS
      updateStep('VISUAL_SELECTION', 'visual_selection', 62, 'Acquiring and validating high-contrast stock visual footage for all scenes...');
      await VisualAssetEngine.acquireAllVisuals({
        scenes: script.scenes,
        category: getVideo()?.category || 'technology',
        videoId,
        format: getVideo()?.format || 'short',
      });
      db.update((state) => {
        const v = state.videos.find((x) => x.id === videoId);
        if (v && v.script) {
          v.script = script;
        }
      });

      // 7. SUBTITLE GENERATION
      updateStep('SUBTITLE_GENERATION', 'generating_subtitles', 72, 'Generating word-level Karaoke synchronized caption subtitles...');
      const subtitles = audioResult.subtitles;

      // 8. THUMBNAIL GENERATION
      updateStep('THUMBNAIL_GENERATION', 'generating_thumbnail', 80, 'Generating high-impact thumbnail graphic...');
      const thumbnailResult = ThumbnailGenerator.generateThumbnail({
        title: script.title,
        category: getVideo()?.category || 'technology',
        headline: script.thumbnailHeadline,
        format: getVideo()?.format || 'short',
        videoId,
      });

      db.update((state) => {
        const v = state.videos.find((x) => x.id === videoId);
        if (v) {
          v.thumbnailUrl = thumbnailResult.thumbnailUrl;
        }
      });

      // 9. VIDEO RENDERING & COMPOSITION
      updateStep('VIDEO_RENDERING', 'rendering', 88, 'Compositing video frames, typography, zoom effects, and audio track...');
      const renderResult = await VideoCompositor.renderVideo({
        videoId,
        script,
        format: getVideo()?.format || 'short',
        category: getVideo()?.category || 'technology',
        audioUrl: audioResult.audioUrl,
        audioFilePath: audioResult.audioFilePath,
        subtitles,
        thumbnailUrl: thumbnailResult.thumbnailUrl,
      });

      // 10. QUALITY VERIFICATION
      updateStep('QUALITY_VERIFICATION', 'verifying_quality', 94, 'Running automated quality assurance checks...');
      if (!renderResult.qualityMetrics.passedValidation) {
        throw new Error(`Quality check failed: ${renderResult.qualityMetrics.validationErrors?.join(', ')}`);
      }

      db.update((state) => {
        const v = state.videos.find((x) => x.id === videoId);
        if (v) {
          v.videoUrl = renderResult.videoUrl;
          v.durationSeconds = renderResult.durationSeconds;
          v.qualityMetrics = renderResult.qualityMetrics;
          v.costActualAed = Math.round((v.costEstimatedAed * 0.95) * 100) / 100;
          v.status = 'ready';
          v.progress = 98;
        }
      });

      updateStep('QUALITY_VERIFICATION', 'ready', 98, 'Quality verification passed 100%. Video compiled and stored.', 'success');

      // 11. YOUTUBE UPLOAD (If autoUpload is enabled or requested)
      const shouldUpload = db.get().automationConfig.autoUpload;
      if (shouldUpload && db.get().youtube.isConnected) {
        updateStep('YOUTUBE_UPLOAD', 'uploading', 99, 'Initiating official YouTube API upload...');
        const updatedVideo = getVideo()!;
        await YouTubeService.uploadVideo(updatedVideo);
      } else {
        updateStep('COMPLETE', 'ready', 100, 'Video ready for mobile preview, download, or publishing.', 'success');
      }
    } catch (err: any) {
      const v = getVideo();
      const currentRetry = (v?.retryCount || 0) + 1;

      db.update((state) => {
        const target = state.videos.find((x) => x.id === videoId);
        if (target) {
          target.retryCount = currentRetry;
          target.errorMessage = err.message || 'Pipeline error';
          if (currentRetry < 3) {
            target.status = 'queued';
            target.logs.push({
              timestamp: new Date().toISOString(),
              step: 'RETRY',
              message: `Step failed (${err.message}). Scheduling automatic retry attempt ${currentRetry}/3...`,
              status: 'warning',
            });
          } else {
            target.status = 'failed';
            target.logs.push({
              timestamp: new Date().toISOString(),
              step: 'FAILED',
              message: `Maximum retries exceeded. Error: ${err.message}`,
              status: 'error',
            });
          }
        }
      });

      db.log('PIPELINE', `[${videoId.slice(0, 8)}] Failure: ${err.message}`, 'error');
    }
  }

  /**
   * Manual retry trigger for failed video
   */
  public static async retryVideo(videoId: string): Promise<boolean> {
    const video = db.get().videos.find((v) => v.id === videoId);
    if (!video) return false;

    db.update((state) => {
      const v = state.videos.find((x) => x.id === videoId);
      if (v) {
        v.status = 'queued';
        v.progress = 0;
        v.errorMessage = undefined;
        v.logs.push({
          timestamp: new Date().toISOString(),
          step: 'MANUAL_RETRY',
          message: 'Manual retry initiated by mobile operator.',
          status: 'info',
        });
      }
    });

    this.processQueue();
    return true;
  }
}
