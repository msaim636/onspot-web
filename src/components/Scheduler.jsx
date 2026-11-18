import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

export default function Scheduler({ selectedCaption, onPostSaved, onClearSelection, onToast }) {
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Set default scheduled time to 1 hour from now formatted for datetime-local
  useEffect(() => {
    if (selectedCaption) {
      const now = new Date();
      now.setHours(now.getHours() + 1);
      now.setMinutes(0, 0, 0); // round to next hour
      // Local ISO string slice for datetime-local input (YYYY-MM-DDTHH:mm)
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
      setScheduledTime(localISOTime);
      setError(null);
    }
  }, [selectedCaption]);

  if (!selectedCaption) return null;

  // Minimum time allowed (current minute)
  const getMinDateTime = () => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);

    if (!scheduledTime) {
      setError('Please select a date and time to schedule this post.');
      return;
    }

    const scheduledDate = new Date(scheduledTime);
    if (isNaN(scheduledDate.getTime())) {
      setError('Please provide a valid date and time.');
      return;
    }

    if (scheduledDate <= new Date()) {
      setError('Scheduled time must be in the future.');
      return;
    }

    setLoading(true);

    try {
      const postPayload = {
        caption: selectedCaption.caption,
        hashtags: selectedCaption.hashtags || [],
        scheduledTime: scheduledDate.toISOString(),
        status: 'scheduled',
      };

      // 1. POST to /api/drive
      const driveRes = await fetch('/api/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postPayload),
      });

      if (!driveRes.ok) {
        const errorData = await driveRes.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Failed to save post (${driveRes.status})`);
      }

      // 2. POST to /api/notify
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caption: selectedCaption.caption,
            hashtags: selectedCaption.hashtags || [],
            scheduledTime: scheduledDate.toISOString(),
          }),
        });
      } catch (notifyErr) {
        // Notification failure shouldn't necessarily block successful post creation
        console.warn('Notification failed:', notifyErr);
      }

      if (onToast) {
        onToast('Post scheduled successfully!', 'success');
      }

      // 3. Call onPostSaved() to refresh list
      if (onPostSaved) {
        await onPostSaved();
      }

      // 4. Clear selection
      if (onClearSelection) {
        onClearSelection();
      }
    } catch (err) {
      setError(err.message || 'Failed to schedule post.');
      if (onToast) {
        onToast(err.message || 'Failed to schedule post.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const captionText = selectedCaption.caption || '';
  const previewText = captionText.length > 160 ? `${captionText.substring(0, 160)}...` : captionText;
  const hashtags = Array.isArray(selectedCaption.hashtags)
    ? selectedCaption.hashtags
    : typeof selectedCaption.hashtags === 'string'
    ? selectedCaption.hashtags.split(/\s+/).filter(Boolean)
    : [];

  return (
    <section className="bg-white rounded-xl border-2 border-primary/30 shadow-card p-5 sm:p-6 animate-slide-in transition-all">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-primary border border-blue-200 mb-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Caption Selected
          </div>
          <h2 className="text-xl font-bold text-appText">Schedule Post</h2>
          <p className="text-sm text-gray-500">
            Choose the publish time and save your post to the schedule.
          </p>
        </div>
        <button
          type="button"
          onClick={onClearSelection}
          className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
          title="Cancel selection"
          aria-label="Cancel selection"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Selected Caption Preview */}
      <div className="bg-gray-50 rounded-lg p-3.5 border border-cardBorder mb-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
          Caption Preview
        </p>
        <p className="text-sm text-appText italic whitespace-pre-wrap line-clamp-3">
          "{previewText}"
        </p>
        {hashtags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {hashtags.map((tag, idx) => (
              <span key={idx} className="text-xs font-medium text-primary">
                {tag.startsWith('#') ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label htmlFor="scheduled-time" className="block text-sm font-medium text-appText mb-1.5">
            Publication Date & Time
          </label>
          <input
            id="scheduled-time"
            type="datetime-local"
            min={getMinDateTime()}
            value={scheduledTime}
            onChange={(e) => {
              setScheduledTime(e.target.value);
              if (error) setError(null);
            }}
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-cardBorder text-appText focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-sm bg-white"
            disabled={loading}
          />
          <p className="text-xs text-gray-400 mt-1">
            Select a future time for when this post should be released.
          </p>
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

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClearSelection}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !scheduledTime}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="text-white" />
                <span>Scheduling...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Save & Schedule</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
