import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

export default function Scheduler({ selectedCaption, onPostSaved, onClearSelection, onToast }) {
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedCaption) {
      // Default to 2 hours from now rounded
      const now = new Date();
      now.setHours(now.getHours() + 2);
      now.setMinutes(0, 0, 0);
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
      setScheduledTime(localISOTime);
      setError(null);
    }
  }, [selectedCaption]);

  if (!selectedCaption) return null;

  const setPreset = (hoursFromNow) => {
    const d = new Date();
    d.setHours(d.getHours() + hoursFromNow);
    d.setMinutes(0, 0, 0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    setScheduledTime(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16));
  };

  const getMinDateTime = () => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);

    if (!scheduledTime) {
      setError('Please select a date and time.');
      return;
    }

    const scheduledDate = new Date(scheduledTime);
    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      setError('Please select a future date and time.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        caption: selectedCaption.caption,
        hashtags: selectedCaption.hashtags || [],
        scheduledTime: scheduledDate.toISOString(),
        status: 'scheduled',
      };

      // 1. Save to Drive / Local
      const res = await fetch('/api/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save post (${res.status})`);
      }

      // 2. Trigger notification
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (notifyErr) {
        console.warn('Notification error:', notifyErr);
      }

      onToast?.('Post scheduled successfully', 'success');
      if (onPostSaved) await onPostSaved();
      if (onClearSelection) onClearSelection();
    } catch (err) {
      setError(err.message || 'Error scheduling post.');
      onToast?.(err.message || 'Error scheduling post', 'error');
    } finally {
      setLoading(false);
    }
  };

  const captionText = selectedCaption.caption || '';
  const preview = captionText.length > 120 ? `${captionText.slice(0, 120)}...` : captionText;

  return (
    <section className="bg-white rounded-2xl border border-neutral-900 shadow-sm p-6 sm:p-7 animate-slide-in">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-neutral-900"></span>
          <h2 className="text-base font-semibold text-neutral-900 tracking-tight">
            Schedule Slot
          </h2>
        </div>
        <button
          type="button"
          onClick={onClearSelection}
          className="text-neutral-400 hover:text-neutral-600 text-xs flex items-center gap-1 transition"
        >
          Cancel
        </button>
      </div>

      {/* Selected Preview Box */}
      <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 mb-5">
        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block mb-1">
          Draft Content
        </span>
        <p className="text-xs text-neutral-700 italic line-clamp-2">
          "{preview}"
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-2">
            Target Publication Date & Time
          </label>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            <button
              type="button"
              onClick={() => setPreset(1)}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 transition"
            >
              In 1 hr
            </button>
            <button
              type="button"
              onClick={() => setPreset(4)}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 transition"
            >
              In 4 hrs
            </button>
            <button
              type="button"
              onClick={() => setPreset(24)}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 transition"
            >
              Tomorrow
            </button>
          </div>

          <input
            type="datetime-local"
            min={getMinDateTime()}
            value={scheduledTime}
            onChange={(e) => {
              setScheduledTime(e.target.value);
              if (error) setError(null);
            }}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition text-sm bg-white"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="p-3 bg-rose-50/70 border border-rose-200/70 rounded-xl text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClearSelection}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition"
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={loading || !scheduledTime}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-40 transition shadow-xs"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="text-white" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Confirm & Schedule</span>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
