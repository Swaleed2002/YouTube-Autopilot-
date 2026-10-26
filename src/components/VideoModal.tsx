import React, { useState } from 'react';
import { X, Play, Download, Send, AlertTriangle, CheckCircle, Clock, FileText, Shield } from 'lucide-react';
import { VideoRecord } from '../types';

interface VideoModalProps {
  video: VideoRecord | null;
  onClose: () => void;
  onPublish: (id: string, privacy: 'private' | 'unlisted' | 'public') => Promise<void>;
  onRetry: (id: string) => Promise<void>;
}

export const VideoModal: React.FC<VideoModalProps> = ({ video, onClose, onPublish, onRetry }) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedPrivacy, setSelectedPrivacy] = useState<'private' | 'unlisted' | 'public'>('private');
  const [activeTab, setActiveTab] = useState<'preview' | 'script' | 'logs'>('preview');

  if (!video) return null;

  const handlePublishClick = async () => {
    setIsPublishing(true);
    try {
      await onPublish(video.id, selectedPrivacy);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                video.format === 'short'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              }`}
            >
              {video.format}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                video.status === 'published'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : video.status === 'ready'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : video.status === 'failed'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {video.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/20 px-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-2.5 px-3 border-b-2 transition ${
              activeTab === 'preview'
                ? 'border-red-500 text-red-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Video Player
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`py-2.5 px-3 border-b-2 transition ${
              activeTab === 'script'
                ? 'border-red-500 text-red-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Script & Scenes ({video.script?.scenes.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-2.5 px-3 border-b-2 transition ${
              activeTab === 'logs'
                ? 'border-red-500 text-red-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Pipeline Logs ({video.logs?.length || 0})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'preview' && (
            <div className="space-y-4">
              {/* Player Stage */}
              <div
                className={`relative mx-auto rounded-xl overflow-hidden bg-black border border-slate-800 shadow-lg ${
                  video.format === 'short' ? 'w-full max-w-[280px] aspect-[9/16]' : 'w-full aspect-[16/9]'
                }`}
              >
                {video.videoUrl?.endsWith('.mp4') ? (
                  <video
                    src={video.videoUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  />
                ) : video.videoUrl ? (
                  <iframe
                    src={video.videoUrl}
                    title={video.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; encrypted-media; gyroscope"
                  />
                ) : video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                    <Clock className="w-8 h-8 text-amber-400 animate-spin mb-2" />
                    <p className="text-xs text-slate-300 font-medium">{video.currentStep} ({video.progress}%)</p>
                  </div>
                )}
              </div>

              {/* Title & Metadata */}
              <div>
                <h2 className="text-base font-bold text-white leading-snug">{video.title}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span>Duration: <strong>{video.durationSeconds}s</strong></span>
                  <span>Est. Cost: <strong>AED {video.costEstimatedAed.toFixed(2)}</strong></span>
                  <span>Actual Cost: <strong>AED {video.costActualAed.toFixed(2)}</strong></span>
                </div>
              </div>

              {/* YouTube Link if published */}
              {video.youtubeUrl && (
                <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-200">Published to YouTube</span>
                  </div>
                  <a
                    href={video.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-red-400 hover:text-red-300 underline"
                  >
                    View on YouTube &rarr;
                  </a>
                </div>
              )}

              {/* Publishing Controls for Ready Videos */}
              {video.status === 'ready' && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-400" />
                      Publish Mode
                    </span>
                    <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-[11px]">
                      {(['private', 'unlisted', 'public'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setSelectedPrivacy(mode)}
                          className={`px-2.5 py-1 rounded-md font-semibold transition ${
                            selectedPrivacy === mode
                              ? 'bg-red-600 text-white'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handlePublishClick}
                    disabled={isPublishing}
                    className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isPublishing ? 'Uploading to YouTube...' : `Upload to YouTube (${selectedPrivacy})`}
                  </button>
                </div>
              )}

              {video.status === 'failed' && (
                <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    Pipeline Error
                  </div>
                  <p className="text-xs text-red-300">{video.errorMessage || 'Execution encountered an error.'}</p>
                  <button
                    onClick={() => onRetry(video.id)}
                    className="w-full py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition"
                  >
                    Retry Full Pipeline
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'script' && (
            <div className="space-y-4">
              {/* Hook */}
              {video.script?.hook && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Opening 3s Hook</span>
                  <p className="text-xs text-amber-100 font-semibold mt-1">"{video.script.hook}"</p>
                </div>
              )}

              {/* Scenes Breakdown */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-300">Scene Timeline</span>
                {video.script?.scenes.map((scene) => (
                  <div key={scene.index} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-red-400">Scene {scene.index} ({scene.durationSeconds}s)</span>
                      {scene.textOnScreen && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-cyan-300 font-mono">
                          {scene.textOnScreen}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">{scene.narration}</p>
                    <p className="text-[11px] text-slate-400 italic">Visual: {scene.visualPrompt}</p>
                  </div>
                ))}
              </div>

              {/* Tags & Sources */}
              {video.script?.tags && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SEO Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {video.script.tags.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300">Detailed Stage Execution Records</span>
              <div className="space-y-1.5 font-mono text-[11px]">
                {video.logs?.map((l, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-lg border flex items-start gap-2 ${
                      l.status === 'success'
                        ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
                        : l.status === 'error'
                        ? 'bg-red-950/20 border-red-500/20 text-red-300'
                        : l.status === 'warning'
                        ? 'bg-amber-950/20 border-amber-500/20 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="opacity-50 text-[10px] shrink-0">{new Date(l.timestamp).toLocaleTimeString()}</span>
                    <div>
                      <span className="font-bold text-[10px] uppercase mr-1.5">[{l.step}]</span>
                      <span>{l.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
