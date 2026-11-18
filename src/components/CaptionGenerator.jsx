import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

const TONES = [
  { id: 'engaging', label: 'Engaging' },
  { id: 'professional', label: 'Professional' },
  { id: 'casual', label: 'Casual' },
  { id: 'punchy', label: 'Punchy' },
];

export default function CaptionGenerator({ onSelectCaption, selectedCaption, onToast }) {
  const [prompt, setPrompt] = useState('');
  const [selectedTone, setSelectedTone] = useState('engaging');
  const [captions, setCaptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);

  const handleGenerate = async (e) => {
    e?.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError('Please provide a brief topic or prompt for your post.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fullPrompt = `Tone: ${selectedTone}. Topic: ${trimmed}`;
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || `Request failed (${response.status})`);
      }

      const data = await response.json();
      let results = [];
      if (Array.isArray(data)) {
        results = data;
      } else if (Array.isArray(data.captions)) {
        results = data.captions;
      } else if (data.caption) {
        results = [{ caption: data.caption, hashtags: data.hashtags || [] }];
      }

      const normalized = results.map((item, idx) => {
        let hashtags = item.hashtags || [];
        if (typeof hashtags === 'string') {
          hashtags = hashtags.split(/\s+/).filter(Boolean);
        }
        return {
          id: item.id ?? idx,
          caption: item.caption || item.text || '',
          hashtags: Array.isArray(hashtags) ? hashtags : [hashtags],
        };
      });

      setCaptions(normalized);
      if (normalized.length === 0) {
        setError('No captions generated. Try rewording your prompt.');
      }
    } catch (err) {
      setError(err.message || 'Failed to generate captions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
    onToast?.('Caption copied to clipboard', 'info');
  };

  const isSelected = (item) => {
    return selectedCaption && selectedCaption.caption === item.caption;
  };

  return (
    <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-7">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5 pb-4 border-b border-neutral-100">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 tracking-tight">
            Compose Post
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Describe your idea, product launch, or thought to generate tailored options.
          </p>
        </div>

        {/* Tone Selection Pills */}
        <div className="flex items-center gap-1.5 pt-2 sm:pt-0">
          {TONES.map((tone) => (
            <button
              key={tone.id}
              type="button"
              onClick={() => setSelectedTone(tone.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                selectedTone === tone.id
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100/80 text-neutral-600 hover:bg-neutral-200/60'
              }`}
            >
              {tone.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleGenerate} className="space-y-4">
        <div className="relative">
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Announcing our new summer cold brew lineup with notes of caramel and orange peel..."
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition text-sm resize-none bg-neutral-50/40"
            disabled={loading}
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2 pointer-events-none">
            <span className="text-[11px] font-mono text-neutral-400">
              {prompt.length} chars
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50/70 border border-rose-200/70 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
            <svg className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="flex-1">{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="hidden sm:inline-block text-[11px] text-neutral-400">
            Press <kbd className="px-1.5 py-0.5 rounded border border-neutral-200 bg-neutral-50 font-mono text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded border border-neutral-200 bg-neutral-50 font-mono text-[10px]">Enter</kbd> to run
          </span>

          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none transition shadow-xs ml-auto"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="text-white" />
                <span>Crafting captions...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Generate Options</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Generated Results Deck */}
      {captions.length > 0 && (
        <div className="mt-7 pt-6 border-t border-neutral-100 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Generated Options ({captions.length})
            </span>
            <span className="text-[11px] text-neutral-400">
              Select one to schedule
            </span>
          </div>

          <div className="space-y-3">
            {captions.map((item, idx) => {
              const selected = isSelected(item);
              const isCopied = copiedIdx === idx;

              return (
                <div
                  key={item.id ?? idx}
                  className={`p-4 rounded-xl border transition-all text-sm ${
                    selected
                      ? 'border-neutral-900 ring-1 ring-neutral-900/10 bg-neutral-50/60 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <p className="text-neutral-800 leading-relaxed whitespace-pre-wrap">
                    {item.caption}
                  </p>

                  {item.hashtags && item.hashtags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.hashtags.map((tag, tagIdx) => (
                        <span
                          key={tagIdx}
                          className="text-xs text-neutral-500 font-mono bg-neutral-100/70 px-2 py-0.5 rounded-md"
                        >
                          {tag.startsWith('#') ? tag : `#${tag}`}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3.5 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(`${item.caption}\n\n${item.hashtags.join(' ')}`, idx)}
                      className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition px-2 py-1 rounded hover:bg-neutral-100"
                    >
                      {isCopied ? (
                        <>
                          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-emerald-600 font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onSelectCaption({
                          caption: item.caption,
                          hashtags: item.hashtags,
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        selected
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200/80'
                      }`}
                    >
                      {selected ? 'Selected for Schedule' : 'Select'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
