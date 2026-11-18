import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

export default function NotificationSettings({ onToast }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  const [settings, setSettings] = useState({
    recipientEmail: '',
    emailSubjectTemplate: 'OnSpot: New Post Scheduled',
    includeHashtags: true,
    includeScheduledTime: true,
    notifyOnCreate: true,
    notifyOnEdit: false,
    notifyOnDelete: false,
  });

  // Load settings from /api/settings on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data) {
            setSettings((prev) => ({
              ...prev,
              ...(data.settings || data),
            }));
          }
        }
      } catch (err) {
        // Fallback to default settings silently
        console.warn('Could not load existing settings, using defaults.', err);
      } finally {
        if (isMounted) {
          setInitialLoading(false);
        }
      }
    }

    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    if (feedback) setFeedback(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    // Validate email format if provided
    if (settings.recipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.recipientEmail)) {
      setFeedback({ type: 'error', message: 'Please enter a valid email address.' });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Failed to save settings (${res.status})`);
      }

      setFeedback({ type: 'success', message: 'Notification settings saved successfully!' });
      if (onToast) {
        onToast('Notification settings saved!', 'success');
      }
    } catch (err) {
      const msg = err.message || 'Failed to save notification settings.';
      setFeedback({ type: 'error', message: msg });
      if (onToast) {
        onToast(msg, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-xl border border-cardBorder shadow-subtle overflow-hidden transition-all">
      {/* Clickable Header for Collapsible */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full p-5 sm:p-6 text-left flex items-center justify-between hover:bg-gray-50/50 transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-appText">Notification Settings</h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Configure email alert triggers and delivery preferences
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {initialLoading && <LoadingSpinner size="sm" className="text-gray-400" />}
          <div className={`transform transition-transform duration-200 text-gray-400 ${isOpen ? 'rotate-180' : ''}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="px-5 pb-6 sm:px-6 pt-2 border-t border-cardBorder animate-slide-in">
          {feedback && (
            <div
              role="alert"
              className={`mb-5 p-3 rounded-lg text-sm flex items-start gap-2.5 animate-fade-in ${
                feedback.type === 'success'
                  ? 'bg-green-50 text-success border border-green-200'
                  : 'bg-red-50 text-error border border-red-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            {/* Recipient Email */}
            <div>
              <label htmlFor="recipientEmail" className="block text-sm font-medium text-appText mb-1">
                Recipient Email
              </label>
              <input
                id="recipientEmail"
                type="email"
                placeholder="you@company.com"
                value={settings.recipientEmail || ''}
                onChange={(e) => handleChange('recipientEmail', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-cardBorder text-appText placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Leave blank or configure where notification emails are dispatched.
              </p>
            </div>

            {/* Email Subject Template */}
            <div>
              <label htmlFor="emailSubjectTemplate" className="block text-sm font-medium text-appText mb-1">
                Email Subject Template
              </label>
              <input
                id="emailSubjectTemplate"
                type="text"
                placeholder="OnSpot: New Post Scheduled"
                value={settings.emailSubjectTemplate || ''}
                onChange={(e) => handleChange('emailSubjectTemplate', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-cardBorder text-appText placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-sm"
              />
            </div>

            {/* Checkboxes Group: Content Options */}
            <div className="pt-2">
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Content Inclusions
              </span>
              <div className="space-y-2.5">
                <label className="flex items-center gap-3 cursor-pointer text-sm text-appText">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.includeHashtags)}
                    onChange={(e) => handleChange('includeHashtags', e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-cardBorder"
                  />
                  <span>Include Hashtags in email</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm text-appText">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.includeScheduledTime)}
                    onChange={(e) => handleChange('includeScheduledTime', e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-cardBorder"
                  />
                  <span>Include Scheduled Time</span>
                </label>
              </div>
            </div>

            {/* Checkboxes Group: Notification Triggers */}
            <div className="pt-2">
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Notification Triggers
              </span>
              <div className="space-y-2.5">
                <label className="flex items-center gap-3 cursor-pointer text-sm text-appText">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.notifyOnCreate)}
                    onChange={(e) => handleChange('notifyOnCreate', e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-cardBorder"
                  />
                  <span>Notify on Create</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm text-appText">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.notifyOnEdit)}
                    onChange={(e) => handleChange('notifyOnEdit', e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-cardBorder"
                  />
                  <span>Notify on Edit</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm text-appText">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.notifyOnDelete)}
                    onChange={(e) => handleChange('notifyOnDelete', e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-cardBorder"
                  />
                  <span>Notify on Delete</span>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-cardBorder">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                {saving ? (
                  <>
                    <LoadingSpinner size="sm" className="text-white" />
                    <span>Saving Settings...</span>
                  </>
                ) : (
                  <span>Save Settings</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
