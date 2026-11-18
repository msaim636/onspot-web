import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

export default function PostList({ posts = [], onRefresh, loading, onToast }) {
  const [editingPostId, setEditingPostId] = useState(null);
  const [editCaption, setEditCaption] = useState('');
  const [savingPostId, setSavingPostId] = useState(null);
  const [deletingPostId, setDeletingPostId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Sort posts by scheduled time (newest first)
  const sortedPosts = [...(posts || [])].sort((a, b) => {
    const timeA = new Date(a.scheduledTime || a.createdAt || 0).getTime();
    const timeB = new Date(b.scheduledTime || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  const formatScheduledTime = (timeStr) => {
    if (!timeStr) return 'Unscheduled';
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const startEditing = (post) => {
    setEditingPostId(post.id || post._id);
    setEditCaption(post.caption || '');
  };

  const cancelEditing = () => {
    setEditingPostId(null);
    setEditCaption('');
  };

  const handleSaveEdit = async (post) => {
    const postId = post.id || post._id;
    if (!editCaption.trim()) {
      if (onToast) onToast('Caption cannot be empty.', 'error');
      return;
    }

    setSavingPostId(postId);

    try {
      const payload = {
        ...post,
        id: postId,
        caption: editCaption.trim(),
      };

      const response = await fetch(`/api/drive?id=${encodeURIComponent(postId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Failed to update post (${response.status})`);
      }

      setEditingPostId(null);
      if (onToast) onToast('Post updated successfully!', 'success');
      if (onRefresh) await onRefresh();
    } catch (err) {
      if (onToast) onToast(err.message || 'Error updating post.', 'error');
    } finally {
      setSavingPostId(null);
    }
  };

  const handleDelete = async (postId) => {
    setDeletingPostId(postId);
    setConfirmDeleteId(null);

    try {
      const response = await fetch(`/api/drive?id=${encodeURIComponent(postId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: postId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Failed to delete post (${response.status})`);
      }

      if (onToast) onToast('Post deleted successfully.', 'info');
      if (onRefresh) await onRefresh();
    } catch (err) {
      if (onToast) onToast(err.message || 'Failed to delete post.', 'error');
    } finally {
      setDeletingPostId(null);
    }
  };

  const getStatusBadge = (status = 'scheduled') => {
    const normalized = status.toLowerCase();
    if (normalized === 'published') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-success border border-green-200">
          <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
          Published
        </span>
      );
    }
    if (normalized === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-error border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
          Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-primary border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
        Scheduled
      </span>
    );
  };

  return (
    <section className="bg-white rounded-xl border border-cardBorder shadow-subtle p-5 sm:p-6 transition-all">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-cardBorder">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-bold text-appText">Scheduled Posts</h2>
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
            {sortedPosts.length}
          </span>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 text-gray-500 hover:text-primary rounded-lg hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-primary"
            title="Refresh posts"
            aria-label="Refresh posts"
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      {loading && sortedPosts.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-gray-400">
          <LoadingSpinner size="lg" />
          <p className="mt-3 text-sm">Loading scheduled posts...</p>
        </div>
      ) : sortedPosts.length === 0 ? (
        <div className="py-12 px-4 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-2xl shadow-inner mb-3">
            📅
          </div>
          <h3 className="text-base font-semibold text-appText">No scheduled posts yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
            Generate captions above and schedule your first post to see it listed here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedPosts.map((post) => {
            const postId = post.id || post._id;
            const isEditing = editingPostId === postId;
            const isSaving = savingPostId === postId;
            const isDeleting = deletingPostId === postId;
            const isConfirming = confirmDeleteId === postId;

            const hashtags = Array.isArray(post.hashtags)
              ? post.hashtags
              : typeof post.hashtags === 'string'
              ? post.hashtags.split(/\s+/).filter(Boolean)
              : [];

            return (
              <div
                key={postId}
                className="p-4 sm:p-5 rounded-lg border border-cardBorder hover:border-gray-300 bg-white transition shadow-subtle"
              >
                {/* Header row: Status and Scheduled Time */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(post.status)}
                    <span className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatScheduledTime(post.scheduledTime)}
                    </span>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1">
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => startEditing(post)}
                        disabled={isSaving || isDeleting}
                        className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-md transition"
                        title="Edit caption"
                        aria-label="Edit caption"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}

                    {isConfirming ? (
                      <div className="flex items-center gap-1.5 animate-fade-in bg-red-50 p-1 rounded-md border border-red-200">
                        <span className="text-xs text-error font-medium px-1">Delete?</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(postId)}
                          disabled={isDeleting}
                          className="px-2 py-0.5 text-xs font-semibold bg-error text-white rounded hover:bg-red-700 transition"
                        >
                          {isDeleting ? '...' : 'Yes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-0.5 text-xs font-semibold bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(postId)}
                        disabled={isSaving || isDeleting}
                        className="p-1.5 text-gray-400 hover:text-error hover:bg-red-50 rounded-md transition"
                        title="Delete post"
                        aria-label="Delete post"
                      >
                        {isDeleting ? (
                          <LoadingSpinner size="sm" className="text-error" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Content body */}
                {isEditing ? (
                  <div className="space-y-3 pt-1 animate-fade-in">
                    <label htmlFor={`edit-textarea-${postId}`} className="sr-only">
                      Edit Caption
                    </label>
                    <textarea
                      id={`edit-textarea-${postId}`}
                      rows={4}
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      className="w-full p-3 rounded-lg border border-primary text-sm text-appText focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={isSaving}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={isSaving}
                        className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(post)}
                        disabled={isSaving || !editCaption.trim()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-hover disabled:opacity-50 transition"
                      >
                        {isSaving ? (
                          <>
                            <LoadingSpinner size="sm" className="text-white" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Save</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-appText whitespace-pre-wrap leading-relaxed">
                      {post.caption}
                    </p>

                    {hashtags.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {hashtags.map((tag, tagIdx) => (
                          <span
                            key={tagIdx}
                            className="text-xs font-medium text-primary"
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
