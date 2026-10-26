import React, { useState, useEffect } from 'react';
import {
  Youtube,
  Server,
  DollarSign,
  Activity,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Smartphone,
  ExternalLink,
  Shield,
  Download,
  Copy,
  Info,
  Check,
  KeyRound
} from 'lucide-react';
import { SystemStatus } from '../types';

interface SettingsScreenProps {
  status: SystemStatus | null;
  onRefresh: () => void;
}

interface OAuthStatusConfig {
  hasClientId: boolean;
  hasClientSecret: boolean;
  redirectUri: string;
  scopes: string[];
  userEmail: string;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ status, onRefresh }) => {
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [allTestsPassed, setAllTestsPassed] = useState<boolean | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [oauthConfig, setOAuthConfig] = useState<OAuthStatusConfig | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [copiedUri, setCopiedUri] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  // Fetch OAuth status & configuration diagnostics
  useEffect(() => {
    fetch('/api/youtube/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.config) {
          setOAuthConfig(data.config);
        }
      })
      .catch((err) => console.warn('Failed to load OAuth diagnostics:', err));
  }, []);

  // Listen for popup OAuth postMessage response (in accordance with OAuth iframe guidelines)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin
      const origin = event.origin || '';
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }

      if (event.data?.type === 'YOUTUBE_AUTH_SUCCESS') {
        setAuthSuccessMsg(`Channel successfully authorized: ${event.data.channel || 'Connected'}`);
        setAuthError(null);
        onRefresh();
      } else if (event.data?.type === 'YOUTUBE_AUTH_ERROR') {
        setAuthError(event.data.error || 'Google OAuth authorization rejected');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onRefresh]);

  const handleConnectYouTube = async () => {
    setIsConnecting(true);
    setAuthError(null);
    setAuthSuccessMsg(null);

    try {
      const res = await fetch('/api/youtube/auth-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: window.location.origin }),
      });
      const data = await res.json();

      if (!data.success) {
        setAuthError(data.message || 'Missing Google Cloud OAuth Client credentials.');
        setShowSetupModal(true);
        return;
      }

      if (data.authUrl) {
        // OPEN OAUTH DIRECTLY IN POPUP (Never navigate iframe window.location.href)
        const popup = window.open(
          data.authUrl,
          'google_oauth_popup',
          'width=600,height=720,left=150,top=100'
        );

        if (!popup) {
          setAuthError('Popup blocked by browser. Please allow popups for this site to complete Google OAuth.');
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to initiate Google OAuth flow.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectYouTube = async () => {
    await fetch('/api/youtube/disconnect', { method: 'POST' });
    onRefresh();
  };

  const handleCopyUri = () => {
    const uri = oauthConfig?.redirectUri || 'https://ais-dev-kzut2rgveeovuxm32qkcji-150148597949.europe-west3.run.app/api/youtube/callback';
    navigator.clipboard.writeText(uri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  const handleRunIntegrationTests = async () => {
    setIsRunningTests(true);
    setTestResults(null);
    setAllTestsPassed(null);
    try {
      const res = await fetch('/api/tests/run', { method: 'POST' });
      const data = await res.json();
      setTestResults(data.tests);
      setAllTestsPassed(data.allPassed);
    } catch (err: any) {
      setTestResults([{ name: 'Test Runner Connection', passed: false, message: err.message, durationMs: 0 }]);
      setAllTestsPassed(false);
    } finally {
      setIsRunningTests(false);
    }
  };

  const isConnected = status?.youtube.isConnected;

  return (
    <div className="space-y-4 pb-20">
      {/* Notifications */}
      {authSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{authSuccessMsg}</span>
        </div>
      )}

      {authError && (
        <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 text-xs text-red-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{authError}</span>
          </div>
          <button
            onClick={() => setShowSetupModal(true)}
            className="text-[11px] underline font-bold text-red-300 hover:text-white shrink-0"
          >
            Fix Setup
          </button>
        </div>
      )}

      {/* YouTube Connection Card */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-500" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              YouTube Channel Connection
            </h2>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            {isConnected ? 'Connected' : 'Not Connected'}
          </span>
        </div>

        {isConnected ? (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white">{status?.youtube.channelTitle}</h3>
                <p className="text-[10px] text-slate-400 font-mono">{status?.youtube.channelHandle} &bull; ID: {status?.youtube.channelId}</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t border-slate-900">
              <div className="p-2 rounded-lg bg-slate-900/60">
                <div className="font-bold text-white">{status?.youtube.subscriberCount?.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500">Subscribers</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60">
                <div className="font-bold text-white">{status?.youtube.viewCount?.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500">Views</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60">
                <div className="font-bold text-white">{status?.youtube.videoCount}</div>
                <div className="text-[10px] text-slate-500">Videos</div>
              </div>
            </div>

            <button
              onClick={handleDisconnectYouTube}
              className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold transition"
            >
              Disconnect Channel
            </button>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <p className="text-xs text-slate-300 leading-relaxed">
              Connect your YouTube channel using official Google OAuth 2.0 to enable automated private/public uploads of Shorts and Long-form videos.
            </p>

            <button
              onClick={handleConnectYouTube}
              disabled={isConnecting}
              className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
            >
              <Youtube className="w-4 h-4" />
              <span>{isConnecting ? 'Opening Google Auth Popup...' : 'Connect YouTube with Google OAuth'}</span>
            </button>

            <button
              onClick={() => setShowSetupModal(true)}
              className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>View OAuth Configuration & 403 Troubleshooting</span>
            </button>
          </div>
        )}
      </div>

      {/* Google OAuth Pre-Flight Inspector Card */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Google OAuth 2.0 Pre-Flight Audit
            </h2>
          </div>
          <span className="text-[10px] font-mono text-cyan-400">RFC 6749</span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400">OAuth Endpoint</span>
            <span className="font-mono text-slate-200 text-[11px]">accounts.google.com/o/oauth2/v2/auth</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400">Client ID Status</span>
            <span className={`font-mono text-[11px] font-bold ${oauthConfig?.hasClientId ? 'text-emerald-400' : 'text-amber-400'}`}>
              {oauthConfig?.hasClientId ? 'Configured in Secrets' : 'NOT SET (Action Required)'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400">Client Secret Status</span>
            <span className={`font-mono text-[11px] font-bold ${oauthConfig?.hasClientSecret ? 'text-emerald-400' : 'text-amber-400'}`}>
              {oauthConfig?.hasClientSecret ? 'Secure in Backend' : 'NOT SET (Action Required)'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Authorized Redirect URI (Match in Cloud Console):</span>
              <button
                onClick={handleCopyUri}
                className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
              >
                {copiedUri ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedUri ? 'Copied' : 'Copy URI'}</span>
              </button>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-900 text-[10px] font-mono text-slate-300 break-all select-all">
              {oauthConfig?.redirectUri || 'https://ais-dev-kzut2rgveeovuxm32qkcji-150148597949.europe-west3.run.app/api/youtube/callback'}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px]">Required Scopes:</span>
            <div className="space-y-0.5 font-mono text-[10px] text-slate-300">
              <div>&bull; https://www.googleapis.com/auth/youtube.upload</div>
              <div>&bull; https://www.googleapis.com/auth/youtube.readonly</div>
              <div>&bull; https://www.googleapis.com/auth/userinfo.profile</div>
            </div>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400">Required Test User Email</span>
            <span className="font-mono text-[11px] text-slate-200">syedwaleedahmed975@gmail.com</span>
          </div>
        </div>
      </div>

      {/* Integration Test Suite Runner */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              System Verification & Test Suite
            </h2>
          </div>
          {allTestsPassed !== null && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                allTestsPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {allTestsPassed ? '100% Passed' : 'Failures Detected'}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Verifies backend startup, database connectivity, Gemini script generator, audio synthesis, thumbnail creation, and video quality checks.
        </p>

        <button
          onClick={handleRunIntegrationTests}
          disabled={isRunningTests}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
        >
          <PlayCircle className="w-4 h-4" />
          <span>{isRunningTests ? 'Running Integration Tests...' : 'Run Full Integration Test Suite'}</span>
        </button>

        {testResults && (
          <div className="space-y-1.5 pt-2">
            {testResults.map((t, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
                  t.passed
                    ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
                    : 'bg-red-950/20 border-red-500/20 text-red-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {t.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{t.name}</span>
                </div>
                <span className="font-mono text-[10px] opacity-75">{t.durationMs}ms</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cloud Backend & Engine Status */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <Server className="w-4 h-4 text-purple-400" />
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            Cloud Architecture Status
          </h2>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400">Backend Server</span>
            <span className="font-mono text-emerald-400 font-bold">Online (Port 3000)</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400">AI Model</span>
            <span className="font-mono text-white">Gemini 3.8 Flash (@google/genai)</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400">Voiceover Engine</span>
            <span className="font-mono text-white">Gemini Flash Lite TTS + Edge-TTS</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400">Video Renderer</span>
            <span className="font-mono text-white">FFmpeg 4.4.2 (libx264 + aac)</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400">Persistent Storage</span>
            <span className="font-mono text-white">data/db.json (Zero external setup)</span>
          </div>
        </div>
      </div>

      {/* Android Mobile Installation & Setup Guide */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <Smartphone className="w-4 h-4 text-blue-400" />
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            Mobile-Only Android Operation
          </h2>
        </div>

        <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/20 space-y-2 text-xs text-blue-200">
          <p className="font-semibold text-white">Designed for Non-Technical Android Users:</p>
          <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
            <li>No laptop or command lines required.</li>
            <li>Tap "Install App" or "Add to Home Screen" to install directly as a standalone Android app.</li>
            <li>The cloud system operates 24/7 in the background when the phone is locked or powered off.</li>
            <li>All heavy video rendering takes place entirely on the cloud server.</li>
          </ol>
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white">Native Android Source Code (Kotlin & Compose)</span>
            <span className="text-[10px] text-slate-400">/android folder</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            The full Jetpack Compose Kotlin project is included in the codebase under <code>/android</code>, preconfigured with Material 3 and Retrofit network client.
          </p>
          <a
            href="/api/storage/faceless-autopilot-android.tar.gz"
            download="faceless-autopilot-android.tar.gz"
            className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Native Android Project (.tar.gz)</span>
          </a>
        </div>
      </div>

      {/* OAuth Setup & 403 Troubleshooting Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Google OAuth 403 Root Cause & Fix</h3>
                  <p className="text-[11px] text-slate-400">Step-by-step resolution for YouTube access</p>
                </div>
              </div>
              <button
                onClick={() => setShowSetupModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/30 text-red-300 space-y-1">
                <p className="font-bold">Why Google displayed 403: "You do not have access to this page"</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px]">
                  <li>Missing real <code>GOOGLE_CLIENT_ID</code> in environment (prevented Google from finding your OAuth app).</li>
                  <li>Redirect URI did not match the cloud domain (Google requires exact URI matching).</li>
                  <li>In Google Cloud Console, your Google Account (<code>syedwaleedahmed975@gmail.com</code>) must be listed under "Test users" while the app is in Testing mode.</li>
                </ol>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-white">Exact Steps to Resolve:</p>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-blue-400">Step 1: Open Google Cloud Console</span>
                  <p className="text-[11px] text-slate-400">
                    Visit: <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-blue-400 underline">console.cloud.google.com/apis/credentials</a>
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-blue-400">Step 2: Add Authorized Redirect URI</span>
                  <p className="text-[11px] text-slate-400">Add this exact URI under "Authorized redirect URIs":</p>
                  <div className="p-1.5 rounded-lg bg-slate-900 text-[10px] font-mono text-cyan-300 break-all select-all">
                    {oauthConfig?.redirectUri || 'https://ais-dev-kzut2rgveeovuxm32qkcji-150148597949.europe-west3.run.app/api/youtube/callback'}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-blue-400">Step 3: Add Test User</span>
                  <p className="text-[11px] text-slate-400">
                    In "OAuth consent screen" &gt; "Test users", add: <strong>syedwaleedahmed975@gmail.com</strong>
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-blue-400">Step 4: Enable YouTube Data API v3</span>
                  <p className="text-[11px] text-slate-400">
                    In "APIs & Services" &gt; "Library", search for <strong>YouTube Data API v3</strong> and click Enable.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="font-bold text-blue-400">Step 5: Set Secrets in AI Studio</span>
                  <p className="text-[11px] text-slate-400">
                    In AI Studio Settings &gt; Secrets, add:
                    <br />&bull; <code>GOOGLE_CLIENT_ID</code>
                    <br />&bull; <code>GOOGLE_CLIENT_SECRET</code>
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSetupModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
            >
              Close Guide
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
