/**
 * Faceless Autopilot - Mobile Web Dashboard & Native Controller
 * Designed specifically for non-technical Android phone user without laptop.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  RefreshCw,
  Plus,
  ShieldAlert,
  Youtube,
  Wifi,
  WifiOff
} from 'lucide-react';
import { SystemStatus, VideoRecord, AutomationConfig } from './types';
import { Navigation } from './components/Navigation';
import { PWAInstallButton } from './components/PWAInstallButton';
import { VideoModal } from './components/VideoModal';
import { NewVideoModal } from './components/NewVideoModal';
import { HomeScreen } from './screens/HomeScreen';
import { VideosScreen } from './screens/VideosScreen';
import { AutomationScreen } from './screens/AutomationScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [config, setConfig] = useState<AutomationConfig | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoRecord | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch all core system data
  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [statusRes, videosRes, configRes] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/videos'),
        fetch('/api/automation/config'),
      ]);

      if (statusRes.ok) {
        const s = await statusRes.json();
        setStatus(s);
      }
      if (videosRes.ok) {
        const v = await videosRes.json();
        setVideos(v.videos || []);
        // Update selectedVideo if open
        if (selectedVideo) {
          const updated = (v.videos || []).find((x: VideoRecord) => x.id === selectedVideo.id);
          if (updated) setSelectedVideo(updated);
        }
      }
      if (configRes.ok) {
        const c = await configRes.json();
        setConfig(c.config);
      }
    } catch (err) {
      console.warn('Network fetch notice:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedVideo]);

  // Initial load and periodic polling every 8s
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Check URL query parameters (e.g. ?tab=settings)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['home', 'videos', 'automation', 'analytics', 'settings'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  // Handlers
  const handleToggleAutomation = async (enabled: boolean) => {
    await fetch('/api/automation/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    fetchData();
  };

  const handleEmergencyStop = async () => {
    await fetch('/api/automation/emergency-stop', { method: 'POST' });
    fetchData();
  };

  const handleResumeEmergency = async () => {
    await fetch('/api/automation/resume', { method: 'POST' });
    fetchData();
  };

  const handleUpdateConfig = async (updated: Partial<AutomationConfig>) => {
    await fetch('/api/automation/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    fetchData();
  };

  const handleGenerateVideo = async (format: 'short' | 'long', category: string, customTopic?: string) => {
    const res = await fetch('/api/videos/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, category, customTopic }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to start video production');
    }
    fetchData();
    setActiveTab('videos');
  };

  const handleRetryVideo = async (id: string) => {
    await fetch(`/api/videos/${id}/retry`, { method: 'POST' });
    fetchData();
  };

  const handlePublishVideo = async (id: string, privacy: 'private' | 'unlisted' | 'public' = 'private') => {
    await fetch(`/api/videos/${id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ privacyStatus: privacy }),
    });
    fetchData();
  };

  const handleDeleteVideo = async (id: string) => {
    if (confirm('Delete this video from production storage?')) {
      await fetch(`/api/videos/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Offline Toast if offline */}
      {!isOnline && (
        <div className="bg-amber-600 text-white text-[11px] font-bold py-1 px-3 text-center flex items-center justify-center gap-1.5 sticky top-0 z-50">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode &bull; Cached state displayed</span>
        </div>
      )}

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* Logo / App Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-md shadow-red-900/40">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-tight text-white">Faceless Autopilot</h1>
                {status?.emergencyStop && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Cloud Production Engine</p>
            </div>
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center gap-2">
            <PWAInstallButton />

            <button
              onClick={() => setIsNewModalOpen(true)}
              className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition active:scale-95 shadow-sm"
              title="Create new video"
            >
              <Plus className="w-4 h-4" />
            </button>

            <button
              onClick={fetchData}
              disabled={isRefreshing}
              className={`p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition ${
                isRefreshing ? 'animate-spin text-white' : ''
              }`}
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Screen Content Viewport */}
      <main className="flex-1 max-w-md w-full mx-auto p-4">
        {activeTab === 'home' && (
          <HomeScreen
            status={status}
            recentVideos={videos}
            onToggleAutomation={handleToggleAutomation}
            onEmergencyStop={handleEmergencyStop}
            onResumeEmergency={handleResumeEmergency}
            onOpenNewModal={() => setIsNewModalOpen(true)}
            onSelectVideo={(v) => setSelectedVideo(v)}
            onNavigateTab={(t) => setActiveTab(t)}
          />
        )}

        {activeTab === 'videos' && (
          <VideosScreen
            videos={videos}
            onSelectVideo={(v) => setSelectedVideo(v)}
            onRetryVideo={handleRetryVideo}
            onPublishVideo={(id) => handlePublishVideo(id, 'private')}
            onDeleteVideo={handleDeleteVideo}
          />
        )}

        {activeTab === 'automation' && (
          <AutomationScreen
            config={config}
            onUpdateConfig={handleUpdateConfig}
            onToggleAutomation={handleToggleAutomation}
          />
        )}

        {activeTab === 'analytics' && <AnalyticsScreen status={status} />}

        {activeTab === 'settings' && (
          <SettingsScreen status={status} onRefresh={fetchData} />
        )}
      </main>

      {/* Modals */}
      <VideoModal
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
        onPublish={handlePublishVideo}
        onRetry={handleRetryVideo}
      />

      <NewVideoModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        categories={config?.categories || []}
        onGenerate={handleGenerateVideo}
      />

      {/* Bottom Mobile Navigation */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        readyCount={videos.filter((v) => v.status === 'ready').length}
      />
    </div>
  );
}
