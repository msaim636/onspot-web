import { Resend } from 'resend';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY is not configured' });
  }

  const { caption, hashtags, scheduledTime, settings } = req.body || {};

  if (!caption) {
    return res.status(400).json({ error: 'Caption is required' });
  }

  // Determine recipient
  const recipientEmail = settings?.recipientEmail || process.env.NOTIFICATION_EMAIL;
  if (!recipientEmail) {
    return res.status(200).json({
      success: false,
      skipped: true,
      message: 'No recipient email configured. You can set one in the Notification Settings section.',
    });
  }

  // Build subject
  const subject = settings?.emailSubjectTemplate || 'OnSpot: New Post Scheduled';

  // Should we include hashtags and time?
  const includeHashtags = settings?.includeHashtags !== false;
  const includeTime = settings?.includeScheduledTime !== false;

  // Format hashtags
  let hashtagsStr = '';
  if (includeHashtags && hashtags) {
    if (Array.isArray(hashtags)) {
      hashtagsStr = hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ');
    } else if (typeof hashtags === 'string') {
      hashtagsStr = hashtags;
    }
  }

  // Format time
  let formattedTime = '';
  if (includeTime && scheduledTime) {
    try {
      formattedTime = new Date(scheduledTime).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      formattedTime = scheduledTime;
    }
  }

  // Build HTML email
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">
    <!-- Header -->
    <div style="background: #2563EB; padding: 24px 32px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">
        ✦ OnSpot
      </h1>
      <p style="margin: 6px 0 0; color: rgba(255,255,255,0.85); font-size: 13px;">
        New Post Scheduled
      </p>
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <h2 style="margin: 0 0 16px; color: #111827; font-size: 16px; font-weight: 600;">
        📝 Caption
      </h2>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
          ${caption}
        </p>
      </div>

      ${hashtagsStr ? `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 8px; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
          Hashtags
        </h3>
        <p style="margin: 0; color: #2563EB; font-size: 13px; font-weight: 500;">
          ${hashtagsStr}
        </p>
      </div>
      ` : ''}

      ${formattedTime ? `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 8px; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
          Scheduled For
        </h3>
        <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 500;">
          🗓️ ${formattedTime}
        </p>
      </div>
      ` : ''}
    </div>

    <!-- Footer -->
    <div style="border-top: 1px solid #e5e7eb; padding: 20px 32px; text-align: center; background: #fafafa;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        Sent by OnSpot — AI-Powered Social Media Manager
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: 'OnSpot <onboarding@resend.dev>',
      to: [recipientEmail],
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email', details: error.message });
    }

    return res.status(200).json({ success: true, messageId: data?.id });
  } catch (err) {
    console.error('Email send error:', err);
    return res.status(500).json({
      error: 'Failed to send notification email',
      details: err.message,
    });
  }
}
