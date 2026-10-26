/**
 * Faceless Autopilot - Thumbnail Generator
 * Creates high-CTR 1280x720 / 1080x1920 graphic thumbnails with dynamic visual themes.
 */

import fs from 'fs';
import path from 'path';

export interface ThumbnailOptions {
  title: string;
  category: string;
  headline: string;
  format: 'short' | 'long';
  videoId: string;
}

export class ThumbnailGenerator {
  public static generateThumbnail(options: ThumbnailOptions): {
    thumbnailUrl: string;
    filePath: string;
  } {
    const isShort = options.format === 'short';
    const width = isShort ? 1080 : 1280;
    const height = isShort ? 1920 : 720;

    const storageDir = path.resolve(process.cwd(), 'data/storage');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const safeHeadline = (options.headline || 'UNBELIEVABLE TECH')
      .toUpperCase()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const safeCategory = (options.category || 'TECH INNOVATION')
      .toUpperCase()
      .replace(/_/g, ' ')
      .replace(/&/g, '&amp;');

    const words = safeHeadline.split(/\s+/);
    const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
    const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');

    // Color theme based on category
    let gradStart = '#0f172a';
    let gradMid = '#1e1b4b';
    let accentColor = '#ef4444'; // Red default
    let badgeColor = '#3b82f6'; // Blue

    if (options.category.includes('ai')) {
      accentColor = '#06b6d4'; // Cyan
      badgeColor = '#8b5cf6'; // Purple
      gradMid = '#164e63';
    } else if (options.category.includes('github') || options.category.includes('coding')) {
      accentColor = '#10b981'; // Emerald
      badgeColor = '#3b82f6';
      gradMid = '#064e3b';
    } else if (options.category.includes('science')) {
      accentColor = '#f59e0b'; // Amber
      badgeColor = '#ec4899';
      gradMid = '#451a03';
    }

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${gradStart}"/>
      <stop offset="50%" stop-color="${gradMid}"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${accentColor}"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.9"/>
    </filter>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="14" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>

  <!-- High-tech Grid Lines -->
  <g stroke="#ffffff" stroke-opacity="0.05" stroke-width="2">
    ${Array.from({ length: 8 })
      .map((_, i) => `<line x1="0" y1="${(i + 1) * (height / 8)}" x2="${width}" y2="${(i + 1) * (height / 8)}"/>`)
      .join('')}
    ${Array.from({ length: 12 })
      .map((_, i) => `<line x1="${(i + 1) * (width / 12)}" y1="0" x2="${(i + 1) * (width / 12)}" y2="${height}"/>`)
      .join('')}
  </g>

  <!-- Dramatic Lighting Glow -->
  <circle cx="${width * 0.75}" cy="${height * 0.4}" r="${Math.min(width, height) * 0.4}" fill="${accentColor}" opacity="0.25" filter="url(#glow)"/>
  <circle cx="${width * 0.2}" cy="${height * 0.8}" r="${Math.min(width, height) * 0.3}" fill="${badgeColor}" opacity="0.2" filter="url(#glow)"/>

  <!-- Outer Neon Border -->
  <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="24" fill="none" stroke="${accentColor}" stroke-width="4" stroke-opacity="0.4"/>

  <!-- Category Badge -->
  <g transform="translate(${isShort ? 60 : 80}, ${isShort ? 120 : 90})">
    <rect width="${isShort ? 320 : 260}" height="${isShort ? 64 : 52}" rx="12" fill="${badgeColor}" opacity="0.95"/>
    <text x="${isShort ? 160 : 130}" y="${isShort ? 42 : 34}" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="${isShort ? 26 : 22}" text-anchor="middle" letter-spacing="2">
      ${safeCategory}
    </text>
  </g>

  <!-- Headline Text with Massive Impact -->
  <g transform="translate(${isShort ? 60 : 80}, ${isShort ? height * 0.45 : height * 0.52})" filter="url(#shadow)">
    <text x="0" y="0" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="${isShort ? 86 : 74}" letter-spacing="1">
      ${line1}
    </text>
    ${
      line2
        ? `<text x="0" y="${isShort ? 105 : 90}" fill="url(#accentGrad)" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="${isShort ? 86 : 74}" letter-spacing="1">
            ${line2}
          </text>`
        : ''
    }
  </g>

  <!-- 4K / HD Quality Badge -->
  <g transform="translate(${width - (isShort ? 200 : 180)}, ${height - (isShort ? 140 : 100)})">
    <rect width="${isShort ? 140 : 110}" height="${isShort ? 54 : 44}" rx="8" fill="#ef4444" opacity="0.9"/>
    <text x="${isShort ? 70 : 55}" y="${isShort ? 36 : 29}" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="${isShort ? 24 : 19}" text-anchor="middle">
      ${isShort ? 'SHORTS' : '4K ULTRA'}
    </text>
  </g>
</svg>
    `.trim();

    const fileName = `thumb_${options.videoId}_${Date.now()}.svg`;
    const filePath = path.join(storageDir, fileName);
    fs.writeFileSync(filePath, svg, 'utf-8');

    return {
      thumbnailUrl: `/api/storage/${fileName}`,
      filePath,
    };
  }
}
