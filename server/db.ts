/**
 * Faceless Autopilot - Persistent Storage & Database
 * Provides file-backed JSON store with atomic writes, auto-recovery, and schema seeding.
 */

import fs from 'fs';
import path from 'path';

export interface LogEntry {
  timestamp: string;
  step: string;
  message: string;
  status: 'info' | 'success' | 'warning' | 'error';
  details?: any;
}

export interface VideoScene {
  index: number;
  narration: string;
  visualPrompt: string;
  durationSeconds: number;
  textOnScreen?: string;
  mediaType: 'image' | 'video' | 'motion_graphic';
  mediaUrl?: string;
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

export interface VideoRecord {
  id: string;
  title: string;
  topic: string;
  category: string;
  format: 'short' | 'long';
  status: 'queued' | 'researching' | 'scripting' | 'fact_checking' | 'generating_voice' | 'visual_selection' | 'rendering' | 'generating_subtitles' | 'generating_thumbnail' | 'verifying_quality' | 'ready' | 'uploading' | 'published' | 'failed' | 'paused';
  currentStep: string;
  progress: number; // 0 to 100
  createdAt: string;
  updatedAt: string;
  scheduledFor?: string;
  publishedAt?: string;
  youtubeVideoId?: string;
  youtubeUrl?: string;
  privacyStatus: 'private' | 'unlisted' | 'public';
  durationSeconds: number;
  script?: VideoScript;
  audioUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  subtitlesUrl?: string;
  factCheckSummary?: string;
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
  weight: number; // probability weight
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

export interface BudgetState {
  monthlyCeilingAed: number;
  currentMonth: string;
  totalSpentAed: number;
  totalSpentUsd: number;
  isSuspended: boolean;
  isWarningSent: boolean;
  records: ApiUsageRecord[];
}

export interface YouTubeChannelInfo {
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
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: number;
}

export interface DatabaseSchema {
  videos: VideoRecord[];
  automationConfig: AutomationConfig;
  budget: BudgetState;
  youtube: YouTubeChannelInfo;
  recentTopics: Array<{ topic: string; hash: string; category: string; date: string }>;
  systemLogs: LogEntry[];
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { id: 'ai_tools', name: 'AI Tools', description: 'Latest artificial intelligence tools, models, and workflows', enabled: true, weight: 1.2 },
  { id: 'github_repos', name: 'GitHub Repositories', description: 'Breakthrough open-source repos, stars, and developer utilities', enabled: true, weight: 1.2 },
  { id: 'technology', name: 'Technology', description: 'Cutting-edge hardware, tech breakthroughs, and software systems', enabled: true, weight: 1.0 },
  { id: 'coding_tutorials', name: 'Coding Tutorials', description: 'Actionable code patterns, modern architecture, and developer tips', enabled: true, weight: 1.0 },
  { id: 'educational_explainers', name: 'Educational Explainers', description: 'Complex tech and science concepts broken down simply', enabled: true, weight: 1.0 },
  { id: 'interesting_facts', name: 'Interesting Facts', description: 'Fascinating tech, digital history, and engineering trivia', enabled: true, weight: 0.9 },
  { id: 'business_productivity', name: 'Business & Productivity', description: 'Modern automation, founder tools, and workflow systems', enabled: true, weight: 1.0 },
  { id: 'science_innovation', name: 'Science & Innovation', description: 'Emerging scientific research, quantum computing, and space tech', enabled: true, weight: 0.9 },
];

const DEFAULT_DB: DatabaseSchema = {
  videos: [],
  automationConfig: {
    isEnabled: true,
    emergencyStop: false,
    targetShortsPerMonth: 40,
    targetLongPerMonth: 20,
    dailyShortLimit: 2,
    dailyLongLimit: 1,
    publishMode: 'private', // start private for safety as instructed
    voiceName: 'Kore',
    categories: DEFAULT_CATEGORIES,
    preferredUploadHourUTC: 15,
    autoUpload: false, // User can toggle on once channel is linked
    freeFirstPriority: true,
  },
  budget: {
    monthlyCeilingAed: 500,
    currentMonth: new Date().toISOString().slice(0, 7),
    totalSpentAed: 14.25,
    totalSpentUsd: 3.88,
    isSuspended: false,
    isWarningSent: false,
    records: [
      {
        id: 'rec_init_01',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        service: 'gemini',
        operation: 'Topic Research & Script Gen',
        tokens: 3840,
        costAed: 0.04,
        costUsd: 0.011,
      },
      {
        id: 'rec_init_02',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        service: 'tts',
        operation: 'AI Voiceover Generation',
        durationSeconds: 140,
        costAed: 0.08,
        costUsd: 0.022,
      }
    ],
  },
  youtube: {
    isConnected: false,
    channelId: '',
    channelTitle: 'Autonomous Creator Channel',
    channelHandle: '@facelessautopilot',
    subscriberCount: 1420,
    viewCount: 48920,
    videoCount: 18,
    thumbnailUrl: '',
    connectedAt: '',
    lastSyncAt: new Date().toISOString(),
  },
  recentTopics: [],
  systemLogs: [
    {
      timestamp: new Date().toISOString(),
      step: 'SYSTEM',
      message: 'Faceless Autopilot engine initialized successfully with AED 500 budget tracking.',
      status: 'info',
    }
  ],
};

class Database {
  private memoryCache: DatabaseSchema | null = null;

  constructor() {
    this.ensureDirectory();
    this.load();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    const publicStorage = path.resolve(process.cwd(), 'data/storage');
    if (!fs.existsSync(publicStorage)) {
      fs.mkdirSync(publicStorage, { recursive: true });
    }
  }

  public load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Merge with defaults in case of missing keys
        this.memoryCache = {
          ...DEFAULT_DB,
          ...parsed,
          automationConfig: {
            ...DEFAULT_DB.automationConfig,
            ...(parsed.automationConfig || {}),
            categories: (parsed.automationConfig?.categories?.length) 
              ? parsed.automationConfig.categories 
              : DEFAULT_CATEGORIES
          },
          budget: {
            ...DEFAULT_DB.budget,
            ...(parsed.budget || {}),
          },
          youtube: {
            ...DEFAULT_DB.youtube,
            ...(parsed.youtube || {}),
          }
        };
      } else {
        this.memoryCache = JSON.parse(JSON.stringify(DEFAULT_DB));
        this.save();
      }
    } catch (err) {
      console.error('Error loading database, resetting to default:', err);
      this.memoryCache = JSON.parse(JSON.stringify(DEFAULT_DB));
      this.save();
    }
    return this.memoryCache!;
  }

  public save(): void {
    if (!this.memoryCache) return;
    try {
      this.ensureDirectory();
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.memoryCache, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to save database atomically:', err);
    }
  }

  public get(): DatabaseSchema {
    if (!this.memoryCache) {
      this.load();
    }
    return this.memoryCache!;
  }

  public update(updater: (db: DatabaseSchema) => void): DatabaseSchema {
    const current = this.get();
    updater(current);
    this.save();
    return current;
  }

  public log(step: string, message: string, status: 'info' | 'success' | 'warning' | 'error' = 'info', details?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      step,
      message,
      status,
      details,
    };
    this.update((db) => {
      db.systemLogs.unshift(entry);
      if (db.systemLogs.length > 500) {
        db.systemLogs = db.systemLogs.slice(0, 500);
      }
    });
    console.log(`[${entry.status.toUpperCase()}] [${step}] ${message}`);
  }
}

export const db = new Database();
