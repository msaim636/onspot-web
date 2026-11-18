import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

export default function CaptionGenerator({ onSelectCaption, selectedCaption }) {
  const [prompt, setPrompt] = useState('');
  const [captions, setCaptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async (e) => {
    e?.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError('Please enter a description or idea for your post.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: trimmed }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Failed to generate captions (${response.status})`);
      }

      const data = await response.json();
      
      // Handle various response shapes (array, { captions: [...] }, { data: [...] })
      let results = [];
      if (Array.isArray(data)) {
        results = data;
      } else if (Array.isArray(data.captions)) {
        results = data.captions;
      } else if (Array.isArray(data.data)) {
        results = data.data;
      } else if (data.caption) {
        results = [{ caption: data.caption, hashtags: data.hashtags || [] }];
      } else {
        throw new Error('Unexpected response format from caption generator.');
      }

      // Normalize items
      const normalized = results.map((item, idx) => {
        if (typeof item === 'string') {
          return { id: idx, caption: item, hashtags: [] };
        }
        let hashtags = item.hashtags || [];
        if (typeof hashtags === 'string') {
          hashtags = hashtags.split(/\s+/).filter(Boolean);
        }
        return {
          id: item.id || idx,
          caption: item.caption || item.text || '',
          hashtags: Array.isArray(hashtags) ? hashtags : [hashtags],
        };
      });

      setCaptions(normalized);
      if (normalized.length === 0) {
        setError('No captions generated. Please try a different prompt.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong while generating captions.');
    } finally {
      setLoading(false);
    }
  };

  const isSelected = (item) => {
    if (!selectedCaption) return false;
    return selectedCaption.caption === item.caption;
  };

  const formatHashtag = (tag) => {
    if (!tag) return '';
    return tag.startsWith('#') ? tag : `#${tag}`;
  };

  return (
    <section className="bg-white rounded-xl border border-cardBorder shadow-subtle p-5 sm:p-6 transition-all">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-appText flex items-center gap-2">
          <span>AI Caption Generator</span>
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Describe what you want to post about, and AI will craft engaging captions with relevant hashtags.
        </p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-4">
        <div>
          <label htmlFor="post-prompt" className="sr-only">
            Describe your post idea
          </label>
          <textarea
            id="post-prompt"
            rows={3}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Describe your post idea... (e.g. Launching a new summer coffee blend with refreshing citrus notes)"
            className="w-full px-3.5 py-2.5 rounded-lg border border-cardBorder text-appText placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-sm resize-none"
            disabled={loading}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-error flex items-start gap-2.5 animate-fade-in"
          >
            <svg
              className="w-4 h-4 text-error shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1">{error}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="text-white" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Generate Captions</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Generated Captions List */}
      {captions.length > 0 && (
        <div className="mt-6 pt-6 border-t border-cardBorder space-y-3.5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Suggested Captions ({captions.length})
          </h3>
          <div className="grid grid-cols-1 gap-3.5">
            {captions.map((item, idx) => {
              const selected = isSelected(item);
              return (
                <div
                  key={item.id || idx}
                  className={`p-4 rounded-lg border transition-all text-sm ${
                    selected
                      ? 'border-primary ring-2 ring-primary/20 bg-blue-50/30'
                      : 'border-cardBorder hover:border-gray-300 bg-white shadow-subtle'
                  }`}
                >
                  <p className="text-appText whitespace-pre-wrap leading-relaxed">
                    {item.caption}
                  </p>

                  {item.hashtags && item.hashtags.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {item.hashtags.map((tag, tagIdx) => (
                        <span
                          key={tagIdx}
                          className="text-xs font-medium text-primary hover:underline cursor-pointer"
                        >
                          {formatHashtag(tag)}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      Option {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onSelectCaption({
                          caption: item.caption,
                          hashtags: item.hashtags,
                        })
                      }
                      className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition ${
                        selected
                          ? 'bg-primary text-white hover:bg-primary-hover shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {selected ? '✓ Selected' : 'Select'}
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
