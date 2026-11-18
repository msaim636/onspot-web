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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Failed to fetch posts (${response.status})`);
      }

      const data = await response.json();
      let list = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (Array.isArray(data.posts)) {
        list = data.posts;
      } else if (Array.isArray(data.data)) {
        list = data.data;
      } else if (Array.isArray(data.files)) {
        list = data.files;
      }
      setPosts(list);
    } catch (err) {
      console.warn('Error fetching posts:', err);
      // We don't display an aggressive toast on initial load error if the backend is not yet populated
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleSelectCaption = (captionObj) => {
    setSelectedCaption(captionObj);
    // Smooth scroll down slightly to the scheduler if needed
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
    <div className="min-h-screen bg-white text-appText flex flex-col font-sans">
      <Header />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Section 1: Caption Generator */}
        <CaptionGenerator
          onSelectCaption={handleSelectCaption}
          selectedCaption={selectedCaption}
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

      <footer className="w-full border-t border-cardBorder py-6 text-center text-xs text-gray-400 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          OnSpot &copy; {new Date().getFullYear()} &bull; AI-Powered Social Media Management
        </div>
      </footer>

      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
