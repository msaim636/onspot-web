import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import CaptionGenerator from './components/CaptionGenerator';
import Scheduler from './components/Scheduler';
import PostList from './components/PostList';
import NotificationSettings from './components/NotificationSettings';
import Toast from './components/Toast';
import { useToast } from './hooks/useToast';

export default function App() {
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [selectedCaption, setSelectedCaption] = useState(null);
  const { toasts, addToast, removeToast } = useToast();

  const fetchPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const response = await fetch('/api/drive');
      if (!response.ok) {
        throw new Error('Could not load posts');
      }

      const data = await response.json();
      let list = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (Array.isArray(data.posts)) {
        list = data.posts;
      } else if (Array.isArray(data.data)) {
        list = data.data;
      }
      setPosts(list);
    } catch (err) {
      console.warn('Initial fetch posts notice:', err.message);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleSelectCaption = (captionObj) => {
    setSelectedCaption(captionObj);
    window.requestAnimationFrame(() => {
      const schedulerEl = document.getElementById('scheduler-section');
      if (schedulerEl) {
        schedulerEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  };

  const handleClearSelection = () => {
    setSelectedCaption(null);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900 flex flex-col font-sans selection:bg-neutral-900 selection:text-white">
      <Header />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        {/* Section 1: Caption Generator */}
        <CaptionGenerator
          onSelectCaption={handleSelectCaption}
          selectedCaption={selectedCaption}
          onToast={addToast}
        />

        {/* Section 2: Scheduler (Visible when a caption is selected) */}
        {selectedCaption && (
          <div id="scheduler-section">
            <Scheduler
              selectedCaption={selectedCaption}
              onPostSaved={fetchPosts}
              onClearSelection={handleClearSelection}
              onToast={addToast}
            />
          </div>
        )}

        {/* Section 3: Scheduled Posts List */}
        <PostList
          posts={posts}
          onRefresh={fetchPosts}
          loading={loadingPosts}
          onToast={addToast}
        />

        {/* Section 4: Notification Settings */}
        <NotificationSettings onToast={addToast} />
      </main>

      <footer className="w-full border-t border-neutral-200/80 py-8 text-center text-xs text-neutral-400 bg-white">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>OnSpot Studio &bull; Next-Gen Social Workflow</span>
          <span className="font-mono text-[11px] text-neutral-400">Vercel Serverless &bull; Gemini 3.8 &bull; Drive</span>
        </div>
      </footer>

      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
