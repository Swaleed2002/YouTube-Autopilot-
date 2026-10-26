export interface SystemStatus {
  status: string;
  appName: string;
  version: string;
  emergencyStop: boolean;
  automationEnabled: boolean;
  counts: {
    total: number;
    published: number;
    ready: number;
    failed: number;
    activeQueued: number;
    shortsThisMonth: number;
    targetShorts: number;
    longThisMonth: number;
    targetLong: number;
  };
  budget: BudgetSummary;
  youtube: YouTubeChannel;
  nextScheduledCheck: string;
}

export interface BudgetSummary {
  monthlyCeilingAed: number;
  totalSpentAed: number;
  remainingAed: number;
  totalSpentUsd: number;
  percentage: number;
  isSuspended: boolean;
  isWarning: boolean;
  currentMonth: string;
  recordCount: number;
  recentRecords: ApiUsageRecord[];
}

export interface ApiUsageRecord {
  id: string;
  timestamp: string;
  service: 'gemini' | 'tts' | 'render' | 'youtube';
  operation: string;
  tokens?: number;
  durationSeconds?: number;
  costAed: number;
  costUsd: number;
  videoId?: string;
}

export interface YouTubeChannel {
  isConnected: boolean;
  channelId?: string;
  channelTitle?: string;
  channelHandle?: string;
  subscriberCount?: number;
  viewCount?: number;
  videoCount?: number;
  thumbnailUrl?: string;
  connectedAt?: string;
  lastSyncAt?: string;
}

export interface VideoScene {
  index: number;
  narration: string;
  visualPrompt: string;
  durationSeconds: number;
  textOnScreen?: string;
  mediaType: 'image' | 'video' | 'motion_graphic';
}

export interface VideoScript {
  title: string;
  hook: string;
  scenes: VideoScene[];
  callToAction: string;
  description: string;
  tags: string[];
  thumbnailHeadline: string;
  sources: string[];
}

export interface QualityMetrics {
  durationSeconds: number;
  aspectRatio: '9:16' | '16:9';
  hasVoiceover: boolean;
  hasSubtitles: boolean;
  hasThumbnail: boolean;
  sceneCount: number;
  wordCount: number;
  estimatedPacingWpm: number;
  passedValidation: boolean;
  validationErrors?: string[];
}

export interface LogEntry {
  timestamp: string;
  step: string;
  message: string;
  status: 'info' | 'success' | 'warning' | 'error';
}

export interface VideoRecord {
  id: string;
  title: string;
  topic: string;
  category: string;
  format: 'short' | 'long';
  status: 'queued' | 'researching' | 'scripting' | 'fact_checking' | 'generating_voice' | 'visual_selection' | 'rendering' | 'generating_subtitles' | 'generating_thumbnail' | 'verifying_quality' | 'ready' | 'uploading' | 'published' | 'failed' | 'paused';
  currentStep: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  youtubeVideoId?: string;
  youtubeUrl?: string;
  privacyStatus: 'private' | 'unlisted' | 'public';
  durationSeconds: number;
  script?: VideoScript;
  audioUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  costEstimatedAed: number;
  costActualAed: number;
  qualityMetrics?: QualityMetrics;
  logs: LogEntry[];
  retryCount: number;
  errorMessage?: string;
}

export interface CategoryConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  weight: number;
}

export interface AutomationConfig {
  isEnabled: boolean;
  emergencyStop: boolean;
  targetShortsPerMonth: number;
  targetLongPerMonth: number;
  dailyShortLimit: number;
  dailyLongLimit: number;
  publishMode: 'private' | 'unlisted' | 'public';
  voiceName: string;
  categories: CategoryConfig[];
  preferredUploadHourUTC: number;
  autoUpload: boolean;
  freeFirstPriority: boolean;
}

export interface AnalyticsData {
  channelStats: {
    subscribers: number;
    totalViews: number;
    totalVideos: number;
    estimatedRevenueAed: number;
    monthlyWatchHours: number;
  };
  productionStats: {
    totalVideos: number;
    shortsCount: number;
    longCount: number;
    publishedCount: number;
    successRate: number;
  };
  categoryBreakdown: Record<string, number>;
}
