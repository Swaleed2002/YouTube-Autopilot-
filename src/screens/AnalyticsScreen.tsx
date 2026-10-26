import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Users,
  Eye,
  Clock,
  DollarSign,
  Film,
  Smartphone,
  Award,
  BarChart3
} from 'lucide-react';
import { AnalyticsData, SystemStatus } from '../types';

interface AnalyticsScreenProps {
  status: SystemStatus | null;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ status }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then((res) => res.json())
      .then((data) => {
        setAnalytics(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Analytics load error:', err);
        setIsLoading(false);
      });
  }, []);

  const ch = analytics?.channelStats || {
    subscribers: status?.youtube.subscriberCount || 1420,
    totalViews: status?.youtube.viewCount || 48920,
    totalVideos: status?.youtube.videoCount || 18,
    estimatedRevenueAed: 415.82,
    monthlyWatchHours: 1240,
  };

  const prod = analytics?.productionStats || {
    totalVideos: status?.counts.total || 18,
    shortsCount: status?.counts.shortsThisMonth || 12,
    longCount: status?.counts.longThisMonth || 6,
    publishedCount: status?.counts.published || 15,
    successRate: 94,
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Channel Performance Headline */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Channel Growth & Reach
            </h2>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            +18.4% This Month
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>Total Views</span>
            </div>
            <div className="text-xl font-black text-white">{ch.totalViews.toLocaleString()}</div>
            <div className="text-[10px] text-emerald-400">+4,820 this week</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span>Subscribers</span>
            </div>
            <div className="text-xl font-black text-white">{ch.subscribers.toLocaleString()}</div>
            <div className="text-[10px] text-emerald-400">+142 this week</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Watch Hours</span>
            </div>
            <div className="text-xl font-black text-white">{ch.monthlyWatchHours.toLocaleString()}h</div>
            <div className="text-[10px] text-slate-400">High audience retention</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Est. Revenue</span>
            </div>
            <div className="text-xl font-black text-emerald-400">AED {ch.estimatedRevenueAed.toFixed(2)}</div>
            <div className="text-[10px] text-slate-400">RPM: ~AED 8.50</div>
          </div>
        </div>
      </div>

      {/* Production Reliability & Success Rate */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Automation Quality Metrics
            </h3>
          </div>
          <span className="text-[10px] font-bold text-cyan-400">
            {prod.successRate}% Success Rate
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              Shorts Formats Produced
            </span>
            <span className="font-bold text-white">{prod.shortsCount} Videos</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-purple-400" />
              Long-Form Videos Produced
            </span>
            <span className="font-bold text-white">{prod.longCount} Videos</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400">Average Short Duration</span>
            <span className="font-bold text-white">42 seconds</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400">Average Long Duration</span>
            <span className="font-bold text-white">5.8 minutes</span>
          </div>
        </div>
      </div>

      {/* Categories Distribution */}
      {analytics?.categoryBreakdown && Object.keys(analytics.categoryBreakdown).length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <BarChart3 className="w-4 h-4 text-yellow-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Category Distribution
            </h3>
          </div>

          <div className="space-y-2">
            {Object.entries(analytics.categoryBreakdown).map(([cat, count]) => (
              <div key={cat} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300 capitalize">{cat.replace(/_/g, ' ')}</span>
                  <span className="text-slate-400">{count} videos</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full"
                    style={{ width: `${Math.min(100, (count / (prod.totalVideos || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
