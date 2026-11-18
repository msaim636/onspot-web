import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

export default function NotificationSettings({ onToast }) {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    recipientEmail: '',
    emailSubjectTemplate: 'OnSpot: New Post Scheduled',
    includeHashtags: true,
    includeScheduledTime: true,
    notifyOnCreate: true,
    notifyOnEdit: false,
    notifyOnDelete: false,
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data?.settings) {
            setSettings((prev) => ({ ...prev, ...data.settings }));
          }
        }
      } catch (err) {
        console.warn('Failed to load settings:', err);
      }
    }
    loadSettings();
  }, []);

  const handleToggle = (field) => {
    setSettings((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error('Failed to save settings');
      onToast?.('Settings updated', 'success');
      setIsOpen(false);
    } catch (err) {
      onToast?.(err.message || 'Error saving settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
      {/* Header bar toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-neutral-50/60 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-600">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 tracking-tight">
              Notification Preferences
            </h3>
            <p className="text-[11px] text-neutral-400">
              Configure alert triggers and delivery email
            </p>
          </div>
        </div>

        <svg
          className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Accordion content */}
      {isOpen && (
        <form onSubmit={handleSave} className="p-6 border-t border-neutral-100 space-y-4 bg-neutral-50/20">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Recipient Email
            </label>
            <input
              type="email"
              value={settings.recipientEmail}
              onChange={(e) => setSettings({ ...settings, recipientEmail: e.target.value })}
              placeholder="you@company.com"
              className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Subject Template
            </label>
            <input
              type="text"
              value={settings.emailSubjectTemplate}
              onChange={(e) => setSettings({ ...settings, emailSubjectTemplate: e.target.value })}
              placeholder="OnSpot: New Post Scheduled"
              className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 bg-white"
            />
          </div>

          {/* Toggle Switches */}
          <div className="pt-2 border-t border-neutral-100 space-y-3">
            {[
              { key: 'includeHashtags', label: 'Include hashtags in email' },
              { key: 'includeScheduledTime', label: 'Include scheduled timestamp' },
              { key: 'notifyOnCreate', label: 'Notify when new post is scheduled' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-1">
                <span className="text-xs text-neutral-700">{label}</span>
                <button
                  type="button"
                  onClick={() => handleToggle(key)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings[key] ? 'bg-neutral-900' : 'bg-neutral-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings[key] ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-900"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-40 transition shadow-xs"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
