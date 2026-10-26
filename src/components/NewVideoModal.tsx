import React, { useState } from 'react';
import { X, Sparkles, Film, Smartphone, AlertCircle } from 'lucide-react';
import { CategoryConfig } from '../types';

interface NewVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryConfig[];
  onGenerate: (format: 'short' | 'long', category: string, customTopic?: string) => Promise<void>;
}

export const NewVideoModal: React.FC<NewVideoModalProps> = ({
  isOpen,
  onClose,
  categories,
  onGenerate,
}) => {
  const [format, setFormat] = useState<'short' | 'long'>('short');
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0]?.id || 'ai_tools');
  const [customTopic, setCustomTopic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onGenerate(format, selectedCategory, customTopic.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to start generation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Produce New Video</h2>
              <p className="text-xs text-slate-400">Launch autonomous 14-stage workflow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Video Format</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setFormat('short')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  format === 'short'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  <span className="text-[10px] font-black uppercase text-blue-400">9:16</span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold text-white">YouTube Short</div>
                  <div className="text-[10px] text-slate-400">35-50s vertical ~AED 0.12</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('long')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  format === 'long'
                    ? 'bg-purple-600/20 border-purple-500 text-white shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Film className="w-4 h-4 text-purple-400" />
                  <span className="text-[10px] font-black uppercase text-purple-400">16:9</span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold text-white">Long-Form Video</div>
                  <div className="text-[10px] text-slate-400">5-7m landscape ~AED 0.85</div>
                </div>
              </button>
            </div>
          </div>

          {/* Category Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Content Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-red-500"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Custom Topic */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Custom Topic <span className="text-slate-500 font-normal">(Optional, AI discovers if empty)</span>
            </label>
            <input
              type="text"
              placeholder="e.g., DeepSeek R1 architecture vs Llama 3.3"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-950/40 transition active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? 'Queueing Autonomous Production...' : 'Start Production Pipeline'}
          </button>
        </form>
      </div>
    </div>
  );
};
