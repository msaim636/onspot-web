import React from 'react';

export default function Toast({ toasts = [], onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';

        let badgeBg = 'bg-neutral-900 text-white border-neutral-800';
        let dotColor = 'bg-neutral-400';

        if (isSuccess) {
          badgeBg = 'bg-neutral-900 text-white border-neutral-800';
          dotColor = 'bg-emerald-400';
        } else if (isError) {
          badgeBg = 'bg-neutral-900 text-white border-neutral-800';
          dotColor = 'bg-rose-400';
        }

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border shadow-xl text-xs font-medium transition-all duration-200 animate-slide-in ${badgeBg}`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`}></span>
              <span className="leading-snug">{toast.message}</span>
            </div>
            {onDismiss && (
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="text-neutral-400 hover:text-white transition-colors p-1"
                aria-label="Dismiss"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
