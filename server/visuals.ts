/**
 * Faceless Autopilot - Visual Asset Engine
 * Searches, downloads, validates, and manages real visual assets (images and video clips)
 * for every scene across categories. Guarantees no scene is blank.
 */

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { VideoScene, db } from './db.js';

const execFileAsync = promisify(execFile);

// Curated pool of high-resolution, verified, topic-relevant stock visuals
const CURATED_VISUAL_LIBRARY: Record<string, string[]> = {
  ai_tools: [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1280&q=80', // abstract neural AI
    'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=1280&q=80', // brain network
    'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1280&q=80', // neural circuitry
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1280&q=80', // generative AI
    'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=1280&q=80', // robotic intelligence
    'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=1280&q=80', // AI assistant interface
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1280&q=80', // high-tech microchip
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1280&q=80', // cyber tech
  ],
  github_repos: [
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1280&q=80', // matrix code terminal
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1280&q=80', // code editor on laptop
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1280&q=80', // clean syntax code
    'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=1280&q=80', // developer workstation
    'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=1280&q=80', // html web programming
    'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=1280&q=80', // developer coding
    'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1280&q=80', // python / backend code
  ],
  technology: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1280&q=80', // chip circuitry
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1280&q=80', // cyber technology
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1280&q=80', // terminal tech
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1280&q=80', // engineering teamwork
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1280&q=80', // cloud server rack
    'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=1280&q=80', // optic fibers & speed
    'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=1280&q=80', // sleek laptop technology
  ],
  coding_tutorials: [
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1280&q=80', // code lines
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1280&q=80', // programming screen
    'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=1280&q=80', // web coding
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1280&q=80', // matrix code
    'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=1280&q=80', // IDE code view
    'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1280&q=80', // dev screen
  ],
  educational_explainers: [
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1280&q=80', // earth & digital globe
    'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=1280&q=80', // knowledge network
    'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1280&q=80', // laboratory chemistry
    'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=1280&q=80', // mathematics & equations
    'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1280&q=80', // orbit and satellite
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1280&q=80', // charts & data explainer
  ],
  interesting_facts: [
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1280&q=80', // deep space earth
    'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1280&q=80', // space station
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1280&q=80', // microscopic chip
    'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=1280&q=80', // human mind & tech
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1280&q=80', // innovation research
  ],
  business_productivity: [
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1280&q=80', // analytics dashboard
    'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1280&q=80', // business strategy
    'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=1280&q=80', // productivity workspace
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1280&q=80', // collaboration
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1280&q=80', // agile sprint
  ],
  science_innovation: [
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1280&q=80', // cosmic space & globe
    'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1280&q=80', // NASA satellite orbit
    'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1280&q=80', // deep space galaxy & nebula
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1280&q=80', // silicon chip architecture
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1280&q=80', // robotics laboratory
    'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1280&q=80', // scientific discovery
    'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=1280&q=80', // cosmic planet surface
    'https://images.unsplash.com/photo-1447433589675-4aaa569f3e05?w=1280&q=80', // starry night observatory
  ],
};

// Keyword-specific image mappings for specific topic nuances
const KEYWORD_VISUAL_MAP: Array<{ keywords: string[]; urls: string[] }> = [
  {
    keywords: ['voyager', 'nasa', 'space', 'astronomy', 'probe', 'orbit', 'telemetry', 'interstellar'],
    urls: [
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1280&q=80',
      'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1280&q=80',
      'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1280&q=80',
      'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=1280&q=80',
      'https://images.unsplash.com/photo-1447433589675-4aaa569f3e05?w=1280&q=80',
    ],
  },
  {
    keywords: ['chip', 'semiconductor', 'hardware', 'transistor', 'cpu', 'memory', 'circuit'],
    urls: [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1280&q=80',
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1280&q=80',
      'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=1280&q=80',
    ],
  },
  {
    keywords: ['github', 'repository', 'open-source', 'code', 'commit', 'star', 'pull request'],
    urls: [
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1280&q=80',
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1280&q=80',
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1280&q=80',
      'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=1280&q=80',
    ],
  },
  {
    keywords: ['ai', 'deepseek', 'llm', 'chatgpt', 'model', 'neural', 'weights', 'intelligence'],
    urls: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1280&q=80',
      'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=1280&q=80',
      'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1280&q=80',
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1280&q=80',
    ],
  },
  {
    keywords: ['mobile', 'phone', 'smartphone', 'android', 'app'],
    urls: [
      'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1280&q=80',
      'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=1280&q=80',
    ],
  },
];

export class VisualAssetEngine {
  private static assetsDir = path.resolve(process.cwd(), 'data/storage/assets');

  public static ensureDir(): void {
    if (!fs.existsSync(this.assetsDir)) {
      fs.mkdirSync(this.assetsDir, { recursive: true });
    }
  }

  /**
   * Downloads a remote asset with validation, timeout, and disk safety.
   */
  public static async downloadAsset(url: string, targetPath: string): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[VISUALS] Asset download returned HTTP ${response.status}: ${url}`);
        return false;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 8000) {
        console.warn(`[VISUALS] Asset download too small (${buffer.length} bytes): ${url}`);
        return false;
      }

      const tempFile = `${targetPath}.tmp_${Date.now()}`;
      fs.writeFileSync(tempFile, buffer);
      fs.renameSync(tempFile, targetPath);

      // Verify file via ffprobe to guarantee it is a valid visual stream
      const isValid = await this.verifyVisualFile(targetPath);
      if (!isValid) {
        try { fs.unlinkSync(targetPath); } catch {}
        return false;
      }

      return true;
    } catch (err: any) {
      clearTimeout(timeout);
      console.warn(`[VISUALS] Failed to download asset ${url}: ${err.message}`);
      return false;
    }
  }

  /**
   * Verifies that the file exists, has valid dimensions, and contains a genuine image/video stream.
   */
  public static async verifyVisualFile(filePath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(filePath)) return false;
      const stat = fs.statSync(filePath);
      if (stat.size < 8000) return false;

      const { stdout } = await execFileAsync('/usr/bin/ffprobe', [
        '-v', 'error',
        '-show_entries', 'stream=codec_name,codec_type,width,height',
        '-of', 'json',
        filePath,
      ]);

      const parsed = JSON.parse(stdout);
      const videoStream = parsed.streams?.find((s: any) => s.codec_type === 'video');
      if (!videoStream || !videoStream.width || !videoStream.height) {
        return false;
      }

      return videoStream.width >= 320 && videoStream.height >= 320;
    } catch {
      return false;
    }
  }

  /**
   * Selects candidate URLs based on scene prompt, text on screen, and category.
   */
  public static getCandidateUrls(scene: VideoScene, category: string, sceneIndex: number): string[] {
    const textCorpus = `${scene.visualPrompt || ''} ${scene.narration || ''} ${scene.textOnScreen || ''}`.toLowerCase();
    const candidates: string[] = [];

    // 1. Check keyword maps
    for (const mapping of KEYWORD_VISUAL_MAP) {
      const matches = mapping.keywords.some((k) => textCorpus.includes(k));
      if (matches) {
        // Pick rotation based on sceneIndex
        const pick = mapping.urls[sceneIndex % mapping.urls.length];
        if (pick && !candidates.includes(pick)) candidates.push(pick);
        // Add others from same group as fallback
        for (const u of mapping.urls) {
          if (!candidates.includes(u)) candidates.push(u);
        }
      }
    }

    // 2. Add category-specific curated visuals
    const categoryPool = CURATED_VISUAL_LIBRARY[category] || CURATED_VISUAL_LIBRARY.technology;
    const catPick = categoryPool[sceneIndex % categoryPool.length];
    if (catPick && !candidates.includes(catPick)) candidates.push(catPick);
    for (const u of categoryPool) {
      if (!candidates.includes(u)) candidates.push(u);
    }

    // 3. Add general high-tech visuals as fallback
    for (const u of CURATED_VISUAL_LIBRARY.technology) {
      if (!candidates.includes(u)) candidates.push(u);
    }

    return candidates;
  }

  /**
   * Acquires a verified visual asset for a scene.
   * Downloads to disk and sets scene.mediaUrl to the local file path.
   * Throws an explicit error if all candidate sources fail.
   */
  public static async acquireVisualForScene(params: {
    scene: VideoScene;
    category: string;
    videoId: string;
    sceneIndex: number;
    format: 'short' | 'long';
  }): Promise<string> {
    this.ensureDir();

    const targetFileName = `scene_${params.videoId}_${params.sceneIndex}.jpg`;
    const targetPath = path.join(this.assetsDir, targetFileName);

    // If file already exists and is valid, reuse it
    if (await this.verifyVisualFile(targetPath)) {
      params.scene.mediaUrl = targetPath;
      return targetPath;
    }

    const candidateUrls = this.getCandidateUrls(params.scene, params.category, params.sceneIndex);

    for (let i = 0; i < candidateUrls.length; i++) {
      const url = candidateUrls[i];
      const ok = await this.downloadAsset(url, targetPath);
      if (ok) {
        params.scene.mediaUrl = targetPath;
        return targetPath;
      }
    }

    throw new Error(
      `Visual asset acquisition failed for scene ${params.sceneIndex} ("${params.scene.textOnScreen || params.scene.visualPrompt}"). No valid visual footage or image could be downloaded.`
    );
  }

  /**
   * Batch acquires visual assets for all scenes in a script.
   */
  public static async acquireAllVisuals(params: {
    scenes: VideoScene[];
    category: string;
    videoId: string;
    format: 'short' | 'long';
  }): Promise<string[]> {
    const localPaths: string[] = [];

    for (let i = 0; i < params.scenes.length; i++) {
      const scene = params.scenes[i];
      const localPath = await this.acquireVisualForScene({
        scene,
        category: params.category,
        videoId: params.videoId,
        sceneIndex: i + 1,
        format: params.format,
      });
      localPaths.push(localPath);
    }

    db.log(
      'VISUALS',
      `[${params.videoId.slice(0, 8)}] Successfully verified and acquired ${localPaths.length} visual assets for all scenes.`,
      'success'
    );

    return localPaths;
  }
}
