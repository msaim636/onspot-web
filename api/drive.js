import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

// --- Local Storage Fallback Helpers ---
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');

function ensureLocalDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

function getLocalPosts() {
  ensureLocalDir();
  if (!fs.existsSync(POSTS_FILE)) return [];
  try {
    const raw = fs.readFileSync(POSTS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalPosts(posts) {
  ensureLocalDir();
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf-8');
}

// --- Google Drive Helpers ---

function hasDriveCredentials() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  );
}

function getAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

function getDrive(auth) {
  return google.drive({ version: 'v3', auth });
}

async function findOrCreateFolder(drive, folderName = 'OnSpot Posts') {
  const search = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (search.data.files && search.data.files.length > 0) {
    return search.data.files[0].id;
  }

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  return folder.data.id;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// --- Main Handler ---

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // If Drive credentials exist, try Google Drive. Otherwise, use seamless local storage.
  const useDrive = hasDriveCredentials();

  try {
    if (useDrive) {
      const auth = getAuthClient();
      const drive = getDrive(auth);
      const folderId = await findOrCreateFolder(drive);

      switch (req.method) {
        case 'GET':
          return await handleDriveGet(drive, folderId, res);
        case 'POST':
          return await handleDrivePost(drive, folderId, req, res);
        case 'PUT':
          return await handleDrivePut(drive, folderId, req, res);
        case 'DELETE':
          return await handleDriveDelete(drive, folderId, req, res);
        default:
          return res.status(405).json({ error: 'Method not allowed' });
      }
    } else {
      // Fallback: Local JSON storage mode (works immediately without OAuth)
      switch (req.method) {
        case 'GET':
          return handleLocalGet(res);
        case 'POST':
          return handleLocalPost(req, res);
        case 'PUT':
          return handleLocalPut(req, res);
        case 'DELETE':
          return handleLocalDelete(req, res);
        default:
          return res.status(405).json({ error: 'Method not allowed' });
      }
    }
  } catch (err) {
    console.error('Storage operation error, falling back to local:', err);
    // Graceful fallback to local if Drive fails
    try {
      switch (req.method) {
        case 'GET':
          return handleLocalGet(res);
        case 'POST':
          return handleLocalPost(req, res);
        case 'PUT':
          return handleLocalPut(req, res);
        case 'DELETE':
          return handleLocalDelete(req, res);
        default:
          return res.status(500).json({ error: 'Storage operation failed', details: err.message });
      }
    } catch (fallbackErr) {
      return res.status(500).json({ error: 'Storage operation failed', details: fallbackErr.message });
    }
  }
}

// ==========================================
// --- Local Storage Handlers (Fallback) ---
// ==========================================

function handleLocalGet(res) {
  const posts = getLocalPosts();
  return res.status(200).json({ posts, storage: 'local' });
}

function handleLocalPost(req, res) {
  const { caption, hashtags, scheduledTime, status } = req.body || {};
  if (!caption) {
    return res.status(400).json({ error: 'Caption is required' });
  }

  const posts = getLocalPosts();
  const id = generateId();
  const post = {
    id,
    caption,
    hashtags: hashtags || '',
    scheduledTime: scheduledTime || null,
    status: status || 'scheduled',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    storage: 'local',
  };

  posts.unshift(post);
  saveLocalPosts(posts);

  return res.status(201).json({ post });
}

function handleLocalPut(req, res) {
  const id = req.body?.id || req.query?.id;
  const { caption, hashtags, scheduledTime, status } = req.body || {};

  if (!id) {
    return res.status(400).json({ error: 'Post id is required' });
  }

  const posts = getLocalPosts();
  const index = posts.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const current = posts[index];
  const updated = {
    ...current,
    caption: caption !== undefined ? caption : current.caption,
    hashtags: hashtags !== undefined ? hashtags : current.hashtags,
    scheduledTime: scheduledTime !== undefined ? scheduledTime : current.scheduledTime,
    status: status !== undefined ? status : current.status,
    updatedAt: new Date().toISOString(),
  };

  posts[index] = updated;
  saveLocalPosts(posts);

  return res.status(200).json({ post: updated });
}

function handleLocalDelete(req, res) {
  const id = req.body?.id || req.query?.id;

  if (!id) {
    return res.status(400).json({ error: 'Post id is required' });
  }

  let posts = getLocalPosts();
  const initialLength = posts.length;
  posts = posts.filter((p) => p.id !== id);

  if (posts.length === initialLength) {
    return res.status(404).json({ error: 'Post not found' });
  }

  saveLocalPosts(posts);
  return res.status(200).json({ success: true });
}

// ==========================================
// --- Google Drive Handlers ---
// ==========================================

async function handleDriveGet(drive, folderId, res) {
  const list = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false and name contains 'post-'`,
    fields: 'files(id, name)',
    spaces: 'drive',
    orderBy: 'createdTime desc',
    pageSize: 100,
  });

  const files = list.data.files || [];
  const posts = [];

  for (const file of files) {
    try {
      const content = await drive.files.get({
        fileId: file.id,
        alt: 'media',
      });
      const postData = typeof content.data === 'string'
        ? JSON.parse(content.data)
        : content.data;
      posts.push({ ...postData, driveFileId: file.id, storage: 'drive' });
    } catch (err) {
      console.warn(`Skipping file ${file.name}:`, err.message);
    }
  }

  return res.status(200).json({ posts, storage: 'drive' });
}

async function handleDrivePost(drive, folderId, req, res) {
  const { caption, hashtags, scheduledTime, status } = req.body || {};

  if (!caption) {
    return res.status(400).json({ error: 'Caption is required' });
  }

  const id = generateId();
  const post = {
    id,
    caption,
    hashtags: hashtags || '',
    scheduledTime: scheduledTime || null,
    status: status || 'scheduled',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    storage: 'drive',
  };

  const file = await drive.files.create({
    requestBody: {
      name: `post-${id}.json`,
      mimeType: 'application/json',
      parents: [folderId],
    },
    media: {
      mimeType: 'application/json',
      body: JSON.stringify(post, null, 2),
    },
    fields: 'id, name',
  });

  return res.status(201).json({ post: { ...post, driveFileId: file.data.id } });
}

async function handleDrivePut(drive, folderId, req, res) {
  const id = req.body?.id || req.query?.id;
  const { caption, hashtags, scheduledTime, status } = req.body || {};

  if (!id) {
    return res.status(400).json({ error: 'Post id is required' });
  }

  const search = await drive.files.list({
    q: `'${folderId}' in parents and name='post-${id}.json' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (!search.data.files || search.data.files.length === 0) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const fileId = search.data.files[0].id;
  let currentPost = {};
  try {
    const content = await drive.files.get({ fileId, alt: 'media' });
    currentPost = typeof content.data === 'string' ? JSON.parse(content.data) : content.data;
  } catch {}

  const updatedPost = {
    ...currentPost,
    id,
    caption: caption !== undefined ? caption : currentPost.caption,
    hashtags: hashtags !== undefined ? hashtags : currentPost.hashtags,
    scheduledTime: scheduledTime !== undefined ? scheduledTime : currentPost.scheduledTime,
    status: status !== undefined ? status : currentPost.status,
    updatedAt: new Date().toISOString(),
    storage: 'drive',
  };

  await drive.files.update({
    fileId,
    media: {
      mimeType: 'application/json',
      body: JSON.stringify(updatedPost, null, 2),
    },
  });

  return res.status(200).json({ post: updatedPost });
}

async function handleDriveDelete(drive, folderId, req, res) {
  const id = req.body?.id || req.query?.id;

  if (!id) {
    return res.status(400).json({ error: 'Post id is required' });
  }

  const search = await drive.files.list({
    q: `'${folderId}' in parents and name='post-${id}.json' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });

  if (!search.data.files || search.data.files.length === 0) {
    return res.status(404).json({ error: 'Post not found' });
  }

  await drive.files.delete({ fileId: search.data.files[0].id });
  return res.status(200).json({ success: true });
}
