import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

export default function PostList({ posts = [], onRefresh, loading, onToast }) {
  const [filter, setFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const filteredPosts = posts.filter((post) => {
    if (filter === 'all') return true;
    return (post.status || 'scheduled').toLowerCase() === filter;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    const timeA = new Date(a.scheduledTime || a.createdAt || 0).getTime();
    const timeB = new Date(b.scheduledTime || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unscheduled';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const handleStartEdit = (post) => {
    setEditingId(post.id);
    setEditText(post.caption || '');
  };

  const handleSaveEdit = async (post) => {
    if (!editText.trim()) {
      onToast?.('Caption cannot be empty', 'error');
      return;
    }

    setSavingId(post.id);
    try {
      const res = await fetch(`/api/drive?id=${encodeURIComponent(post.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...post,
          caption: editText.trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to update post');

      onToast?.('Post updated', 'success');
      setEditingId(null);
      if (onRefresh) await onRefresh();
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (postId) => {
    setDeletingId(postId);
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/drive?id=${encodeURIComponent(postId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: postId }),
      });

      if (!res.ok) throw new Error('Failed to delete post');

      onToast?.('Post removed', 'info');
      if (onRefresh) await onRefresh();
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    onToast?.('Caption copied', 'info');
  };

  return (
    <section className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-7">
      {/* Header and Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-semibold text-neutral-900 tracking-tight">
            Schedule Queue
          </h2>
          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
            {posts.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center p-0.5 rounded-lg bg-neutral-100 text-xs font-medium text-neutral-600">
            {['all', 'scheduled', 'draft'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`capitalize px-2.5 py-1 rounded-md transition ${
                  filter === tab
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg border border-neutral-200 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 transition"
            title="Refresh feed"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-neutral-900' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Posts List */}
      {loading && posts.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-neutral-400">
          <LoadingSpinner size="md" className="text-neutral-900" />
          <span className="text-xs mt-3">Syncing posts...</span>
        </div>
      ) : sortedPosts.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm font-medium text-neutral-700">No scheduled posts yet</p>
          <p className="text-xs text-neutral-400 mt-1">
            Create and schedule your first caption above.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedPosts.map((post) => {
            const isEditing = editingId === post.id;
            const isSaving = savingId === post.id;
            const isDeleting = deletingId === post.id;
            const isConfirming = confirmDeleteId === post.id;

            const hashtags = Array.isArray(post.hashtags)
              ? post.hashtags
              : typeof post.hashtags === 'string'
              ? post.hashtags.split(/\s+/).filter(Boolean)
              : [];

            return (
              <div
                key={post.id}
                className="group p-4 rounded-xl border border-neutral-200/90 hover:border-neutral-300 transition-all bg-white"
              >
                {/* Meta Row */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {post.status || 'scheduled'}
                    </span>

                    <span className="text-xs font-mono text-neutral-400">
                      {formatDate(post.scheduledTime)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={() => handleCopy(post.caption)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-md hover:bg-neutral-100 transition"
                      title="Copy text"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>

                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(post)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-md hover:bg-neutral-100 transition"
                        title="Edit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}

                    {isConfirming ? (
                      <div className="flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded-lg border border-rose-200">
                        <span className="text-[10px] text-rose-600 font-semibold">Delete?</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(post.id)}
                          disabled={isDeleting}
                          className="text-[10px] px-1.5 py-0.5 bg-rose-600 text-white rounded font-medium hover:bg-rose-700 transition"
                        >
                          {isDeleting ? '...' : 'Yes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[10px] px-1.5 py-0.5 bg-neutral-200 text-neutral-700 rounded hover:bg-neutral-300 transition"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(post.id)}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Content */}
                {isEditing ? (
                  <div className="space-y-2 mt-2">
                    <textarea
                      rows={3}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full p-3 rounded-lg border border-neutral-900 text-sm text-neutral-900 focus:outline-none"
                      disabled={isSaving}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-900"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(post)}
                        disabled={isSaving}
                        className="px-3 py-1 rounded-md bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-40"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap">
                      {post.caption}
                    </p>

                    {hashtags.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {hashtags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-xs font-mono text-neutral-500 bg-neutral-100/60 px-1.5 py-0.5 rounded"
                          >
                            {tag.startsWith('#') ? tag : `#${tag}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
