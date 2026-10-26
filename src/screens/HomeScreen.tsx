import React from 'react';
import {
  Play,
  Film,
  Smartphone,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Zap,
  TrendingUp,
  DollarSign,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { SystemStatus, VideoRecord } from '../types';

interface HomeScreenProps {
  status: SystemStatus | null;
  recentVideos: VideoRecord[];
  onToggleAutomation: (enabled: boolean) => Promise<void>;
  onEmergencyStop: () => Promise<void>;
  onResumeEmergency: () => Promise<void>;
  onOpenNewModal: () => void;
  onSelectVideo: (video: VideoRecord) => void;
  onNavigateTab: (tab: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  status,
  recentVideos,
  onToggleAutomation,
  onEmergencyStop,
  onResumeEmergency,
  onOpenNewModal,
  onSelectVideo,
  onNavigateTab,
}) => {
  const isEmergency = status?.emergencyStop ?? false;
  const isAutoEnabled = status?.automationEnabled ?? false;
  const budget = status?.budget;
  const counts = status?.counts;

  const shortsPercent = counts ? Math.min(100, Math.round((counts.shortsThisMonth / 40) * 100)) : 0;
  const longPercent = counts ? Math.min(100, Math.round((counts.longThisMonth / 20) * 100)) : 0;

  return (
    <div className="space-y-4 pb-12">
      {/* EMERGENCY STOP BANNER OR ENGAGE BUTTON */}
      {isEmergency ? (
        <div className="rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 p-4 text-white shadow-xl shadow-red-950/40 border border-red-400/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20">
              <ShieldAlert className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide uppercase">Emergency Stop Engaged</h2>
              <p className="text-xs text-red-100">All generation queues and background render jobs are frozen.</p>
            </div>
          </div>
          <button
            onClick={onResumeEmergency}
            className="mt-3.5 w-full py-2.5 px-4 rounded-xl bg-white text-red-700 font-extrabold text-xs shadow-md transition active:scale-95 hover:bg-red-50"
          >
            Resume All Pipelines & Scheduler
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onEmergencyStop}
            className="flex-1 py-2.5 px-3 rounded-xl bg-red-600/15 border border-red-500/30 hover:bg-red-600/25 text-red-400 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95"
          >
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>Emergency STOP (Halt All)</span>
          </button>
          <button
            onClick={() => onToggleAutomation(!isAutoEnabled)}
            className={`py-2.5 px-4 rounded-xl border font-bold text-xs flex items-center gap-2 transition active:scale-95 ${
              isAutoEnabled
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isAutoEnabled ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            <span>{isAutoEnabled ? 'Autopilot Active' : 'Autopilot Paused'}</span>
          </button>
        </div>
      )}

      {/* MONTHLY PRODUCTION TARGET CARD */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3.5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-500/15 text-red-400">
              <Flame className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Monthly Production Quota</h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            {status?.nextScheduledCheck || 'Active 24/7'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Shorts Quota */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1 font-medium">
                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                Shorts (9:16)
              </span>
              <span className="font-bold text-blue-400">{counts?.shortsThisMonth || 0} / 40</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${shortsPercent}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 text-right">{shortsPercent}% target reached</div>
          </div>

          {/* Long Video Quota */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1 font-medium">
                <Film className="w-3.5 h-3.5 text-purple-400" />
                Long-Form (16:9)
              </span>
              <span className="font-bold text-purple-400">{counts?.longThisMonth || 0} / 20</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-400 transition-all duration-500"
                style={{ width: `${longPercent}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 text-right">{longPercent}% target reached</div>
          </div>
        </div>
      </div>

      {/* BUDGET MANAGEMENT CEILING GAUGE */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Operating Budget</h2>
          </div>
          <span className="text-[11px] font-bold text-slate-300">
            Ceiling: <strong className="text-white">AED 500</strong>
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-2xl font-black text-white">
              AED {(budget?.totalSpentAed || 0).toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400">
              ${(budget?.totalSpentUsd || 0).toFixed(2)} USD (~{budget?.percentage || 0}% of monthly ceiling)
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-emerald-400">
              AED {(budget?.remainingAed || 500).toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500">Remaining for {budget?.currentMonth}</div>
          </div>
        </div>

        {/* Budget Progress Bar */}
        <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              (budget?.percentage || 0) >= 80 ? 'bg-red-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, budget?.percentage || 0)}%` }}
          />
        </div>

        {(budget?.percentage || 0) >= 80 && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Budget notice: 80% threshold reached. High-priority free pipelines enforced.</span>
          </div>
        )}
      </div>

      {/* QUICK STATS COUNTERS */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <div className="text-base font-black text-white">{counts?.total || 0}</div>
          <div className="text-[10px] text-slate-400 font-medium">Produced</div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <div className="text-base font-black text-emerald-400">{counts?.published || 0}</div>
          <div className="text-[10px] text-slate-400 font-medium">Published</div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <div className="text-base font-black text-cyan-400">{counts?.ready || 0}</div>
          <div className="text-[10px] text-slate-400 font-medium">Ready</div>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
          <div className="text-base font-black text-red-400">{counts?.failed || 0}</div>
          <div className="text-[10px] text-slate-400 font-medium">Failed</div>
        </div>
      </div>

      {/* QUICK ACTION BUTTON */}
      <button
        onClick={onOpenNewModal}
        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 transition active:scale-95"
      >
        <Zap className="w-4 h-4 fill-white" />
        <span>Instantly Generate Video</span>
      </button>

      {/* RECENT VIDEOS SECTION */}
      <div className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">Recent Production Pipeline</h2>
          <button
            onClick={() => onNavigateTab('videos')}
            className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2">
          {recentVideos.slice(0, 4).map((video) => (
            <div
              key={video.id}
              onClick={() => onSelectVideo(video)}
              className="p-3 rounded-xl bg-slate-900 border border-slate-800/90 hover:border-slate-700 transition cursor-pointer flex items-center gap-3 active:scale-[0.99]"
            >
              {/* Thumbnail / Indicator */}
              <div
                className={`w-12 h-12 rounded-lg shrink-0 flex items-center justify-center overflow-hidden border border-slate-800 ${
                  video.format === 'short' ? 'bg-blue-950/40 text-blue-400' : 'bg-purple-950/40 text-purple-400'
                }`}
              >
                {video.thumbnailUrl ? (
                  <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </div>

              {/* Title & Metadata */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                      video.format === 'short'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-purple-500/20 text-purple-400'
                    }`}
                  >
                    {video.format}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      video.status === 'published'
                        ? 'text-emerald-400'
                        : video.status === 'ready'
                        ? 'text-cyan-400'
                        : video.status === 'failed'
                        ? 'text-red-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {video.status.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white truncate">{video.title}</h3>
                <p className="text-[10px] text-slate-400">
                  {video.durationSeconds}s &bull; AED {video.costActualAed.toFixed(2)} &bull; {new Date(video.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Status Icon */}
              <div>
                {video.status === 'published' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : video.status === 'failed' ? (
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
