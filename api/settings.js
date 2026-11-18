import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const DEFAULT_SETTINGS = {
  recipientEmail: '',
  emailSubjectTemplate: 'OnSpot: New Post Scheduled',
  includeHashtags: true,
  includeScheduledTime: true,
  notifyOnCreate: true,
  notifyOnEdit: false,
  notifyOnDelete: false,
};

function ensureLocalDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

function getLocalSettings() {
  ensureLocalDir();
  if (!fs.existsSync(SETTINGS_FILE)) return DEFAULT_SETTINGS;
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveLocalSettings(settings) {
  ensureLocalDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

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

const SETTINGS_FILENAME = 'onspot-settings.json';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const useDrive = hasDriveCredentials();

  try {
    if (useDrive) {
      const auth = getAuthClient();
      const drive = getDrive(auth);
      const folderId = await findOrCreateFolder(drive);

      if (req.method === 'GET') {
        return await handleDriveGetSettings(drive, folderId, res);
      } else if (req.method === 'POST') {
        return await handleDriveSaveSettings(drive, folderId, req, res);
      } else {
        return res.status(405).json({ error: 'Method not allowed' });
      }
    } else {
      if (req.method === 'GET') {
        return res.status(200).json({ settings: getLocalSettings(), storage: 'local' });
      } else if (req.method === 'POST') {
        const incoming = req.body || {};
        const current = getLocalSettings();
        const settings = {
          ...current,
          ...incoming,
          updatedAt: new Date().toISOString(),
        };
        saveLocalSettings(settings);
        return res.status(200).json({ settings, success: true, storage: 'local' });
      } else {
        return res.status(405).json({ error: 'Method not allowed' });
      }
    }
  } catch (err) {
    console.error('Settings error, falling back to local storage:', err);
    if (req.method === 'GET') {
      return res.status(200).json({ settings: getLocalSettings(), storage: 'local' });
    } else if (req.method === 'POST') {
      const incoming = req.body || {};
      const current = getLocalSettings();
      const settings = {
        ...current,
        ...incoming,
        updatedAt: new Date().toISOString(),
      };
      saveLocalSettings(settings);
      return res.status(200).json({ settings, success: true, storage: 'local' });
    }
    return res.status(500).json({ error: 'Settings failed', details: err.message });
  }
}

async function findSettingsFile(drive, folderId) {
  const search = await drive.files.list({
    q: `'${folderId}' in parents and name='${SETTINGS_FILENAME}' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });

  if (search.data.files && search.data.files.length > 0) {
    return search.data.files[0].id;
  }
  return null;
}

async function handleDriveGetSettings(drive, folderId, res) {
  const fileId = await findSettingsFile(drive, folderId);

  if (!fileId) {
    return res.status(200).json({ settings: DEFAULT_SETTINGS, storage: 'drive' });
  }

  try {
    const content = await drive.files.get({ fileId, alt: 'media' });
    const settings = typeof content.data === 'string'
      ? JSON.parse(content.data)
      : content.data;

    return res.status(200).json({ settings: { ...DEFAULT_SETTINGS, ...settings }, storage: 'drive' });
  } catch {
    return res.status(200).json({ settings: DEFAULT_SETTINGS, storage: 'drive' });
  }
}

async function handleDriveSaveSettings(drive, folderId, req, res) {
  const incoming = req.body || {};

  const settings = {
    recipientEmail: incoming.recipientEmail ?? DEFAULT_SETTINGS.recipientEmail,
    emailSubjectTemplate: incoming.emailSubjectTemplate ?? DEFAULT_SETTINGS.emailSubjectTemplate,
    includeHashtags: incoming.includeHashtags ?? DEFAULT_SETTINGS.includeHashtags,
    includeScheduledTime: incoming.includeScheduledTime ?? DEFAULT_SETTINGS.includeScheduledTime,
    notifyOnCreate: incoming.notifyOnCreate ?? DEFAULT_SETTINGS.notifyOnCreate,
    notifyOnEdit: incoming.notifyOnEdit ?? DEFAULT_SETTINGS.notifyOnEdit,
    notifyOnDelete: incoming.notifyOnDelete ?? DEFAULT_SETTINGS.notifyOnDelete,
    updatedAt: new Date().toISOString(),
  };

  const fileId = await findSettingsFile(drive, folderId);

  if (fileId) {
    await drive.files.update({
      fileId,
      media: {
        mimeType: 'application/json',
        body: JSON.stringify(settings, null, 2),
      },
    });
  } else {
    await drive.files.create({
      requestBody: {
        name: SETTINGS_FILENAME,
        mimeType: 'application/json',
        parents: [folderId],
      },
      media: {
        mimeType: 'application/json',
        body: JSON.stringify(settings, null, 2),
      },
      fields: 'id',
    });
  }

  return res.status(200).json({ settings, success: true, storage: 'drive' });
}
