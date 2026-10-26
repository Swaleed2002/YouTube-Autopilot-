/**
 * Faceless Autopilot - YouTube API v3 & Real Google OAuth 2.0 Service
 * Strictly enforces official Google OAuth 2.0 endpoints, valid client credentials,
 * production redirect URI matching, and real YouTube Data API v3 upload requests.
 */

import { db, VideoRecord } from './db.js';
import { BudgetManager } from './budget.js';
import fs from 'fs';
import path from 'path';

export interface OAuthInspectionResult {
  success: boolean;
  authUrl?: string;
  error?: string;
  message?: string;
  inspection?: {
    endpoint: string;
    hasClientId: boolean;
    clientIdPrefix: string;
    hasClientSecret: boolean;
    redirectUri: string;
    responseType: string;
    accessType: string;
    scopes: string[];
    userEmail: string;
    targetDeployUrl: string;
  };
}

export interface YouTubeUploadResult {
  success: boolean;
  videoId?: string;
  youtubeUrl?: string;
  privacyStatus: 'private' | 'unlisted' | 'public';
  error?: string;
}

export class YouTubeService {
  public static readonly OAUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
  public static readonly TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
  public static readonly YOUTUBE_CHANNELS_API = 'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true';
  public static readonly YOUTUBE_UPLOAD_API = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';

  public static readonly SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  /**
   * Resolves the canonical redirect URI based on deployment environment
   */
  public static resolveRedirectUri(requestOrigin?: string): string {
    // 1. Prefer APP_URL environment variable if set (official AI Studio cloud deployment origin)
    if (process.env.APP_URL && process.env.APP_URL.startsWith('http')) {
      const cleanAppUrl = process.env.APP_URL.replace(/\/+$/, '');
      return `${cleanAppUrl}/api/youtube/callback`;
    }

    // 2. Use requestOrigin if provided and non-localhost when in cloud
    if (requestOrigin && !requestOrigin.includes('localhost:3000')) {
      const cleanOrigin = requestOrigin.replace(/\/+$/, '');
      return `${cleanOrigin}/api/youtube/callback`;
    }

    // 3. Fallback to standard cloud dev URL if known, or localhost
    const defaultCloudUrl = 'https://ais-dev-kzut2rgveeovuxm32qkcji-150148597949.europe-west3.run.app';
    if (process.env.NODE_ENV === 'production' || process.env.K_SERVICE) {
      return `${defaultCloudUrl}/api/youtube/callback`;
    }

    return `${(requestOrigin || 'http://localhost:3000').replace(/\/+$/, '')}/api/youtube/callback`;
  }

  /**
   * Generates Google OAuth 2.0 authorization URL with pre-flight inspection logs.
   * NEVER exposes client secret or private tokens.
   */
  public static getAuthUrl(requestOrigin?: string): OAuthInspectionResult {
    const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID || '').trim();
    const hasSecret = Boolean(process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET);
    const redirectUri = this.resolveRedirectUri(requestOrigin);
    const userEmail = 'syedwaleedahmed975@gmail.com';

    const inspection = {
      endpoint: this.OAUTH_ENDPOINT,
      hasClientId: Boolean(clientId),
      clientIdPrefix: clientId ? `${clientId.slice(0, 16)}...` : 'NONE',
      hasClientSecret: hasSecret,
      redirectUri,
      responseType: 'code',
      accessType: 'offline',
      scopes: this.SCOPES,
      userEmail,
      targetDeployUrl: process.env.APP_URL || 'https://ais-dev-kzut2rgveeovuxm32qkcji-150148597949.europe-west3.run.app',
    };

    console.log('[OAUTH_PREFLIGHT] Inspecting OAuth parameters:', {
      endpoint: inspection.endpoint,
      hasClientId: inspection.hasClientId,
      clientIdPrefix: inspection.clientIdPrefix,
      hasClientSecret: inspection.hasClientSecret,
      redirectUri: inspection.redirectUri,
      responseType: inspection.responseType,
      scopesCount: inspection.scopes.length,
    });

    if (!clientId) {
      const msg = 'Missing GOOGLE_CLIENT_ID environment variable. A valid Google Cloud OAuth 2.0 Client ID is required.';
      db.log('OAUTH', msg, 'error');
      return {
        success: false,
        error: 'MISSING_CLIENT_ID',
        message: msg,
        inspection,
      };
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: `state_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    });

    const authUrl = `${this.OAUTH_ENDPOINT}?${params.toString()}`;

    return {
      success: true,
      authUrl,
      inspection,
    };
  }

  /**
   * Handles real OAuth callback, exchanges code for tokens, and queries channel info.
   * Does NOT mock connection if token exchange fails.
   */
  public static async handleCallback(code: string, requestOrigin?: string): Promise<{
    success: boolean;
    channelTitle?: string;
    error?: string;
  }> {
    const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID || '').trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET || '').trim();
    const redirectUri = this.resolveRedirectUri(requestOrigin);

    if (!clientId || !clientSecret) {
      const err = 'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variable is missing.';
      db.log('OAUTH', `OAuth callback exchange aborted: ${err}`, 'error');
      return { success: false, error: err };
    }

    try {
      db.log('OAUTH', `Exchanging authorization code with ${this.TOKEN_ENDPOINT}...`, 'info');

      const tokenRes = await fetch(this.TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok || tokenData.error) {
        const errorDesc = tokenData.error_description || tokenData.error || `HTTP ${tokenRes.status}`;
        db.log('OAUTH', `Google token exchange rejected: ${errorDesc}`, 'error');
        return {
          success: false,
          error: `Google rejected token exchange (${errorDesc})`,
        };
      }

      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;
      const expiresIn = tokenData.expires_in || 3600;
      const tokenExpiry = Date.now() + (expiresIn * 1000);

      // Query real channel info with Bearer token
      db.log('OAUTH', 'Retrieving authorized YouTube channel metadata...', 'info');
      const channelRes = await fetch(this.YOUTUBE_CHANNELS_API, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!channelRes.ok) {
        const chErr = await channelRes.text();
        db.log('OAUTH', `Failed to query YouTube channels API: ${chErr}`, 'error');
        return { success: false, error: `YouTube API channels query failed: ${channelRes.statusText}` };
      }

      const chData = await channelRes.json();
      const channelItem = chData.items?.[0];

      if (!channelItem) {
        const err = 'No YouTube channel found for the authenticated Google account.';
        db.log('OAUTH', err, 'warning');
        return { success: false, error: err };
      }

      const title = channelItem.snippet.title;
      const id = channelItem.id;
      const handle = channelItem.snippet.customUrl || `@${title.replace(/\s+/g, '')}`;
      const subscriberCount = parseInt(channelItem.statistics?.subscriberCount || '0', 10);
      const viewCount = parseInt(channelItem.statistics?.viewCount || '0', 10);
      const videoCount = parseInt(channelItem.statistics?.videoCount || '0', 10);
      const thumb = channelItem.snippet.thumbnails?.default?.url || '';

      db.update((state) => {
        state.youtube = {
          isConnected: true,
          channelId: id,
          channelTitle: title,
          channelHandle: handle,
          subscriberCount,
          viewCount,
          videoCount,
          thumbnailUrl: thumb,
          connectedAt: new Date().toISOString(),
          lastSyncAt: new Date().toISOString(),
          accessToken,
          refreshToken,
          tokenExpiry,
        };
      });

      db.log('YOUTUBE', `Channel "${title}" (${id}) successfully authorized and connected via Google OAuth.`, 'success');
      return { success: true, channelTitle: title };
    } catch (err: any) {
      db.log('OAUTH', `Exception during OAuth flow: ${err.message}`, 'error');
      return { success: false, error: err.message };
    }
  }

  /**
   * Refreshes access token if expired
   */
  public static async getValidAccessToken(): Promise<string | null> {
    const yt = db.get().youtube;
    if (!yt.isConnected || !yt.accessToken) return null;

    // Check if token is still valid (with 5 minute safety buffer)
    if (yt.tokenExpiry && Date.now() < (yt.tokenExpiry - 300000)) {
      return yt.accessToken;
    }

    if (!yt.refreshToken) {
      console.warn('Access token expired and no refresh token available');
      return yt.accessToken;
    }

    const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID || '').trim();
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET || '').trim();

    if (!clientId || !clientSecret) return yt.accessToken;

    try {
      const res = await fetch(this.TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: yt.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newAccessToken = data.access_token;
        const expiresIn = data.expires_in || 3600;
        db.update((state) => {
          state.youtube.accessToken = newAccessToken;
          state.youtube.tokenExpiry = Date.now() + (expiresIn * 1000);
        });
        return newAccessToken;
      }
    } catch (err) {
      console.error('Failed to refresh YouTube access token:', err);
    }

    return yt.accessToken;
  }

  /**
   * Upload video to YouTube using official YouTube Data API v3 Resumable Upload.
   * Strictly verifies token existence. NEVER fabricates video IDs.
   */
  public static async uploadVideo(video: VideoRecord): Promise<YouTubeUploadResult> {
    const isShort = video.format === 'short';
    const privacy = video.privacyStatus || 'private';

    const token = await this.getValidAccessToken();

    if (!token) {
      const errorMsg = 'YouTube upload blocked: Channel is not authenticated with valid Google OAuth credentials. Please connect your YouTube channel in Settings first.';
      db.log('YOUTUBE', errorMsg, 'error');

      db.update((state) => {
        const v = state.videos.find((x) => x.id === video.id);
        if (v) {
          v.status = 'failed';
          v.errorMessage = errorMsg;
          v.logs.push({
            timestamp: new Date().toISOString(),
            step: 'YOUTUBE_UPLOAD',
            message: errorMsg,
            status: 'error',
          });
        }
      });

      return {
        success: false,
        error: errorMsg,
        privacyStatus: privacy,
      };
    }

    // Locate actual video file on disk
    let videoFilePath = '';
    const storageDir = path.resolve(process.cwd(), 'data/storage');
    const possibleMp4 = path.join(storageDir, `video_${video.id}.mp4`);
    if (fs.existsSync(possibleMp4)) {
      videoFilePath = possibleMp4;
    } else if (video.videoUrl && video.videoUrl.startsWith('/api/storage/')) {
      const localName = path.basename(video.videoUrl);
      const candidate = path.join(storageDir, localName);
      if (fs.existsSync(candidate)) videoFilePath = candidate;
    }

    if (!videoFilePath || !fs.existsSync(videoFilePath)) {
      return {
        success: false,
        error: `Video binary file not found on disk for upload (${video.id})`,
        privacyStatus: privacy,
      };
    }

    const fileSizeBytes = fs.statSync(videoFilePath).size;

    db.log('YOUTUBE', `Starting YouTube Data API v3 Resumable Upload for "${video.title}" (${fileSizeBytes} bytes, privacy: ${privacy})...`, 'info');

    try {
      // Step 1: Initiate Resumable Upload Session
      const metadataPayload = {
        snippet: {
          title: video.title,
          description: video.script?.description || `${video.title}\n\nProduced with Faceless Autopilot.`,
          tags: video.script?.tags || ['technology', 'shorts'],
          categoryId: '28', // Science & Technology
        },
        status: {
          privacyStatus: privacy,
          selfDeclaredMadeForKids: false,
        },
      };

      const initRes = await fetch(this.YOUTUBE_UPLOAD_API, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': 'video/mp4',
          'X-Upload-Content-Length': fileSizeBytes.toString(),
        },
        body: JSON.stringify(metadataPayload),
      });

      if (!initRes.ok) {
        const initErr = await initRes.text();
        throw new Error(`YouTube API init upload session failed (${initRes.status}): ${initErr}`);
      }

      const resumableUploadUrl = initRes.headers.get('Location');
      if (!resumableUploadUrl) {
        throw new Error('YouTube API did not return resumable upload session Location header');
      }

      // Step 2: Upload Binary Data
      const fileStream = fs.readFileSync(videoFilePath);
      const uploadRes = await fetch(resumableUploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': fileSizeBytes.toString(),
        },
        body: fileStream,
      });

      if (!uploadRes.ok) {
        const uploadErr = await uploadRes.text();
        throw new Error(`YouTube API binary chunk upload failed (${uploadRes.status}): ${uploadErr}`);
      }

      const uploadResult = await uploadRes.json();
      const realVideoId = uploadResult.id;

      if (!realVideoId) {
        throw new Error('YouTube API response missing video ID');
      }

      const youtubeUrl = isShort
        ? `https://youtube.com/shorts/${realVideoId}`
        : `https://youtube.com/watch?v=${realVideoId}`;

      BudgetManager.recordUsage({
        service: 'youtube',
        operation: `Upload ${isShort ? 'Short' : 'Long-form'} Video (${privacy})`,
        videoId: video.id,
      });

      db.update((state) => {
        const v = state.videos.find((x) => x.id === video.id);
        if (v) {
          v.youtubeVideoId = realVideoId;
          v.youtubeUrl = youtubeUrl;
          v.publishedAt = new Date().toISOString();
          v.status = 'published';
          v.progress = 100;
          v.currentStep = 'PUBLISHED';
          v.logs.push({
            timestamp: new Date().toISOString(),
            step: 'YOUTUBE_UPLOAD',
            message: `Video published to YouTube (${privacy}). Real ID: ${realVideoId}`,
            status: 'success',
          });
        }
        if (state.youtube.isConnected) {
          state.youtube.videoCount = (state.youtube.videoCount || 0) + 1;
        }
      });

      db.log('YOUTUBE', `Successfully published video to YouTube: ${youtubeUrl}`, 'success');

      return {
        success: true,
        videoId: realVideoId,
        youtubeUrl,
        privacyStatus: privacy,
      };
    } catch (err: any) {
      db.log('YOUTUBE', `YouTube upload failed: ${err.message}`, 'error');
      return {
        success: false,
        error: err.message,
        privacyStatus: privacy,
      };
    }
  }

  public static disconnect(): void {
    db.update((state) => {
      state.youtube.isConnected = false;
      state.youtube.channelId = '';
      state.youtube.channelTitle = '';
      state.youtube.channelHandle = '';
      state.youtube.accessToken = undefined;
      state.youtube.refreshToken = undefined;
      state.youtube.tokenExpiry = undefined;
    });
    db.log('YOUTUBE', 'Channel disconnected and OAuth credentials cleared.', 'info');
  }

  public static getChannelStatus() {
    return db.get().youtube;
  }
}
