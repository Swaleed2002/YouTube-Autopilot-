import React, { useState } from 'react';
import {
  Play,
  Film,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Clock,
  RotateCcw,
  Send,
  Search,
  Filter,
  Download,
  Trash2
} from 'lucide-react';
import { VideoRecord } from '../types';

interface VideosScreenProps {
  videos: VideoRecord[];
  onSelectVideo: (video: VideoRecord) => void;
  onRetryVideo: (id: string) => Promise<void>;
  onPublishVideo: (id: string) => Promise<void>;
  onDeleteVideo: (id: string) => Promise<void>;
}

export const VideosScreen: React.FC<VideosScreenProps> = ({
  videos,
  onSelectVideo,
  onRetryVideo,
  onPublishVideo,
  onDeleteVideo,
}) => {
  const [formatFilter, setFormatFilter] = useState<'all' | 'short' | 'long'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = videos.filter((video) => {
    if (formatFilter !== 'all' && video.format !== formatFilter) return false;
    if (statusFilter !== 'all') {
      if (statusFilter === 'processing' && !['ready', 'published', 'failed'].includes(video.status)) {
        // match processing
      } else if (video.status !== statusFilter) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        video.title.toLowerCase().includes(q) ||
        video.topic.toLowerCase().includes(q) ||
        video.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-3.5 pb-16">
      {/* Search & Header */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search videos, topics, categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Format Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setFormatFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition ${
              formatFilter === 'all'
                ? 'bg-red-600 text-white'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All ({videos.length})
          </button>
          <button
            onClick={() => setFormatFilter('short')}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 flex items-center gap-1.5 transition ${
              formatFilter === 'short'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Shorts ({videos.filter((v) => v.format === 'short').length})</span>
          </button>
          <button
            onClick={() => setFormatFilter('long')}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 flex items-center gap-1.5 transition ${
              formatFilter === 'long'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Long-form ({videos.filter((v) => v.format === 'long').length})</span>
          </button>
        </div>

        {/* Status Filter Sub-Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
          {['all', 'ready', 'published', 'processing', 'failed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md font-semibold capitalize shrink-0 transition ${
                statusFilter === st
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Videos List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2">
            <Film className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-400">No videos found matching filters</p>
          </div>
        ) : (
          filtered.map((video) => {
            const isProcessing = !['ready', 'published', 'failed'].includes(video.status);

            return (
              <div
                key={video.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 p-3.5 space-y-3 shadow-md hover:border-slate-700 transition"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
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
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      {video.category.replace('_', ' ')}
                    </span>
                  </div>

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

                {/* Main Video Info */}
                <div
                  onClick={() => onSelectVideo(video)}
                  className="flex items-start gap-3 cursor-pointer group"
                >
                  <div
                    className={`w-20 rounded-xl overflow-hidden shrink-0 border border-slate-800 relative bg-slate-950 flex items-center justify-center ${
                      video.format === 'short' ? 'aspect-[9/16]' : 'aspect-[16/9]'
                    }`}
                  >
                    {video.thumbnailUrl ? (
                      <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Play className="w-5 h-5 text-slate-500" />
                    )}
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition flex items-center justify-center">
                      <Play className="w-4 h-4 text-white drop-shadow" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="text-xs font-bold text-white group-hover:text-red-400 transition leading-snug line-clamp-2">
                      {video.title}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Duration: <strong>{video.durationSeconds}s</strong> &bull; Cost: <strong>AED {video.costActualAed.toFixed(2)}</strong>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Created: {new Date(video.createdAt).toLocaleDateString()} {new Date(video.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Processing Progress bar if active */}
                {isProcessing && (
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-amber-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 animate-spin" />
                        {video.currentStep}
                      </span>
                      <span className="font-mono text-slate-400">{video.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-all duration-300"
                        style={{ width: `${video.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Error message if failed */}
                {video.status === 'failed' && (
                  <div className="p-2.5 rounded-xl bg-red-950/20 border border-red-500/20 text-[11px] text-red-300 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{video.errorMessage || 'Pipeline error encountered.'}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onSelectVideo(video)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-semibold transition"
                    >
                      Inspect / Play
                    </button>
                    {video.videoUrl && (
                      <a
                        href={video.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 transition"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {video.status === 'ready' && (
                      <button
                        onClick={() => onPublishVideo(video.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition"
                      >
                        <Send className="w-3 h-3" />
                        <span>Publish</span>
                      </button>
                    )}

                    {video.status === 'failed' && (
                      <button
                        onClick={() => onRetryVideo(video.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold flex items-center gap-1 transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Retry</span>
                      </button>
                    )}

                    <button
                      onClick={() => onDeleteVideo(video.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition"
                      title="Delete video"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
