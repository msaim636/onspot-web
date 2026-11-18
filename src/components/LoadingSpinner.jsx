import React from 'react';

export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-solid border-current border-t-transparent ${currentSize} ${className}`}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
