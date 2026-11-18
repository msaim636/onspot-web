import React from 'react';

export default function Header() {
  return (
    <header className="w-full border-b border-cardBorder bg-white py-6 sm:py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-primary shadow-sm border border-blue-100">
            <svg
              className="w-5 h-5 text-primary"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2l2.4 7.2L21.6 12l-7.2 2.8L12 22l-2.4-7.2L2.4 12l7.2-2.8L12 2z" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-appText">
            OnSpot
          </h1>
        </div>
        <p className="mt-2 text-sm sm:text-base text-gray-500 font-medium">
          AI-Powered Social Media Manager
        </p>
      </div>
    </header>
  );
}
