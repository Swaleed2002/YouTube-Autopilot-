import React, { useState } from 'react';
import {
  Sliders,
  Check,
  Volume2,
  Clock,
  Shield,
  Layers,
  Sparkles,
  Save,
  AlertCircle
} from 'lucide-react';
import { AutomationConfig, CategoryConfig } from '../types';

interface AutomationScreenProps {
  config: AutomationConfig | null;
  onUpdateConfig: (updated: Partial<AutomationConfig>) => Promise<void>;
  onToggleAutomation: (enabled: boolean) => Promise<void>;
}

export const AutomationScreen: React.FC<AutomationScreenProps> = ({
  config,
  onUpdateConfig,
  onToggleAutomation,
}) => {
  const [localConfig, setLocalConfig] = useState<AutomationConfig | null>(config);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!config || !localConfig) return null;

  const handleToggleCategory = (catId: string) => {
    const updated = localConfig.categories.map((c) =>
      c.id === catId ? { ...c, enabled: !c.enabled } : c
    );
    setLocalConfig({ ...localConfig, categories: updated });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateConfig(localConfig);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const voices = [
    { id: 'Kore', label: 'Kore (Clear, Engaging Narrator - Gemini TTS)' },
    { id: 'Puck', label: 'Puck (High-Energy, Punchy Host - Gemini TTS)' },
    { id: 'Fenrir', label: 'Fenrir (Deep, Authoritative Documentarian)' },
    { id: 'Zephyr', label: 'Zephyr (Smooth, Conversational Tech Voice)' },
    { id: 'Guy', label: 'Guy (Natural Professional - Edge TTS)' },
  ];

  return (
    <div className="space-y-4 pb-16">
      {/* Master Toggle Banner */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-lg">
        <div>
          <h2 className="text-sm font-bold text-white">Autopilot Production Engine</h2>
          <p className="text-xs text-slate-400">
            {config.isEnabled
              ? 'Active: Cloud server produces on schedule even when phone is locked.'
              : 'Paused: Background production schedule suspended.'}
          </p>
        </div>
        <button
          onClick={() => onToggleAutomation(!config.isEnabled)}
          className={`py-2 px-3.5 rounded-xl font-bold text-xs transition ${
            config.isEnabled
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-950/50'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          {config.isEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Production Quotas & Rates */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <Clock className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Production Targets & Frequency
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold">Shorts / Month (Target: 40)</label>
            <input
              type="number"
              min={1}
              max={120}
              value={localConfig.targetShortsPerMonth}
              onChange={(e) =>
                setLocalConfig({ ...localConfig, targetShortsPerMonth: parseInt(e.target.value, 10) || 40 })
              }
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold">Long-Form / Month (Target: 20)</label>
            <input
              type="number"
              min={1}
              max={60}
              value={localConfig.targetLongPerMonth}
              onChange={(e) =>
                setLocalConfig({ ...localConfig, targetLongPerMonth: parseInt(e.target.value, 10) || 20 })
              }
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold">Max Shorts / Day</label>
            <input
              type="number"
              min={1}
              max={6}
              value={localConfig.dailyShortLimit}
              onChange={(e) =>
                setLocalConfig({ ...localConfig, dailyShortLimit: parseInt(e.target.value, 10) || 2 })
              }
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-400 font-semibold">Max Long-Form / Day</label>
            <input
              type="number"
              min={1}
              max={4}
              value={localConfig.dailyLongLimit}
              onChange={(e) =>
                setLocalConfig({ ...localConfig, dailyLongLimit: parseInt(e.target.value, 10) || 1 })
              }
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
            />
          </div>
        </div>
      </div>

      {/* 8 Content Categories Matrix */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Content Categories (Independent Control)
            </h3>
          </div>
          <span className="text-[10px] font-bold text-purple-400">
            {localConfig.categories.filter((c) => c.enabled).length} / {localConfig.categories.length} Active
          </span>
        </div>

        <div className="space-y-2">
          {localConfig.categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => handleToggleCategory(cat.id)}
              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                cat.enabled
                  ? 'bg-slate-950 border-purple-500/30'
                  : 'bg-slate-950/40 border-slate-800 opacity-60'
              }`}
            >
              <div>
                <h4 className="text-xs font-bold text-white">{cat.name}</h4>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{cat.description}</p>
              </div>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center transition shrink-0 ml-3 ${
                  cat.enabled ? 'bg-purple-600 text-white' : 'border border-slate-700 bg-slate-900'
                }`}
              >
                {cat.enabled && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Voice & Narration Options */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <Volume2 className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            AI Voice Selection
          </h3>
        </div>

        <div className="space-y-2">
          {voices.map((v) => (
            <div
              key={v.id}
              onClick={() => setLocalConfig({ ...localConfig, voiceName: v.id })}
              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                localConfig.voiceName === v.id
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="text-xs font-semibold">{v.label}</span>
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  localConfig.voiceName === v.id ? 'border-emerald-500 bg-emerald-500' : 'border-slate-700'
                }`}
              >
                {localConfig.voiceName === v.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Publishing & Safety Mode */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <Shield className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            YouTube Upload Safeguards
          </h3>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="font-bold text-white">Default Upload Privacy</span>
              <p className="text-[10px] text-slate-400">Strict safety: Start with private uploads during testing.</p>
            </div>
            <select
              value={localConfig.publishMode}
              onChange={(e) => setLocalConfig({ ...localConfig, publishMode: e.target.value as any })}
              className="py-1 px-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            >
              <option value="private">Private (Test Safe)</option>
              <option value="unlisted">Unlisted</option>
              <option value="public">Public</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="font-bold text-white">Auto-Publish On Completion</span>
              <p className="text-[10px] text-slate-400">Push directly to connected channel once rendered.</p>
            </div>
            <button
              onClick={() => setLocalConfig({ ...localConfig, autoUpload: !localConfig.autoUpload })}
              className={`w-10 h-6 rounded-full transition p-1 ${
                localConfig.autoUpload ? 'bg-cyan-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition ${
                  localConfig.autoUpload ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        <span>{isSaved ? 'Settings Saved Successfully!' : isSaving ? 'Saving...' : 'Save Autopilot Configuration'}</span>
      </button>
    </div>
  );
};
