const express = require('express');
const { getMedia } = require('../mediaStore');
const router = express.Router();

function isValidSessionId(sessionId) {
  return typeof sessionId === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(sessionId);
}

/**
 * Mock Meta Graph API — intercepts outbound messages Odoo sends to:
 *   POST https://graph.facebook.com/v{version}/{phoneNumberId}/messages
 *
 * Session-scoped requests are matched as:
 *   POST /session/:sessionId/v:version/:phoneNumberId/messages
 * The legacy unscoped path remains available for backward compatibility.
 *
 * We capture the message body, emit it via Socket.io to the frontend,
 * and respond with a fake successful Meta API response.
 */
function handleOutbound(req, res) {
  const { sessionId, phoneNumberId, version } = req.params;

  if (sessionId && !isValidSessionId(sessionId)) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  const body = req.body;

  console.log(`[mock-meta-api] v${version}/${phoneNumberId}/messages received:`, JSON.stringify(body, null, 2));

  const io = req.app.get('io');

  // Extract reply text from Odoo's outbound message payload
  // Odoo sends standard Cloud API message format
  let outbound = {
    type: 'unknown',
    raw: body,
    phoneNumberId,
    timestamp: Date.now(),
  };

  if (body.type === 'text' && body.text?.body) {
    outbound.type = 'text';
    outbound.text = body.text.body;
    outbound.to = body.to;
  } else if (body.type === 'template') {
    outbound.type = 'template';
    outbound.templateName = body.template?.name;
    outbound.to = body.to;
    // Try to extract text from template components
    const textComponent = body.template?.components?.find(
      (c) => c.type === 'body' || c.type === 'BODY'
    );
    outbound.text = textComponent?.text || `[Template: ${body.template?.name}]`;
  } else if (body.type === 'interactive') {
    outbound.type = 'interactive';
    outbound.to = body.to;
    outbound.text = body.interactive?.body?.text || '[Interactive message]';
  } else if (body.type === 'image') {
    outbound.type = 'image';
    outbound.to = body.to;
    outbound.text = '[Image]';
    outbound.url = body.image?.link;
  } else if (body.type === 'audio') {
    outbound.type = 'audio';
    outbound.to = body.to;
    outbound.text = '[Voice message]';
    outbound.url = body.audio?.link;
  } else if (body.type === 'document') {
    outbound.type = 'document';
    outbound.to = body.to;
    outbound.text = `[Document: ${body.document?.filename || 'file'}]`;
    outbound.url = body.document?.link;
  }

  if (sessionId) {
    // Deliver replies only to the browser window configured with this API URL.
    io.to(`session:${sessionId}`).emit('agent:reply', outbound);
  } else {
    // Backward compatibility for portals still configured with the old base URL.
    io.emit('agent:reply', outbound);
  }

  // Return a valid Meta API success response
  const fakeWamid = `wamid.${Buffer.from(Date.now().toString()).toString('base64')}`;
  return res.status(200).json({
    messaging_product: 'whatsapp',
    contacts: [{ input: body.to, wa_id: body.to }],
    messages: [{ id: fakeWamid }],
  });
}

router.post('/session/:sessionId/v:version/:phoneNumberId/messages', handleOutbound);
router.post('/v:version/:phoneNumberId/messages', handleOutbound);

function getMediaMetadata(req, res) {
  const { sessionId, mediaId } = req.params;
  if (sessionId && !isValidSessionId(sessionId)) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  const media = getMedia(mediaId);
  if (!media) return res.status(404).json({ error: 'Media not found or expired' });

  const origin = `${req.protocol}://${req.get('host')}`;
  const mediaPath = sessionId
    ? `/session/${encodeURIComponent(sessionId)}/media/${media.id}`
    : `/media/${media.id}`;
  return res.json({
    id: media.id,
    url: `${origin}${mediaPath}`,
    mime_type: media.mimeType,
    sha256: media.sha256,
    file_size: media.buffer.length,
  });
}

function downloadMedia(req, res) {
  const { sessionId, mediaId } = req.params;
  if (sessionId && !isValidSessionId(sessionId)) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  const media = getMedia(mediaId);
  if (!media) return res.status(404).json({ error: 'Media not found or expired' });

  const safeFileName = media.fileName.replace(/[\r\n"\\]/g, '_');
  res.set('Content-Type', media.mimeType);
  res.set('Content-Length', String(media.buffer.length));
  res.set('Content-Disposition', `inline; filename="${safeFileName}"`);
  return res.send(media.buffer);
}

router.get('/session/:sessionId/v:version/:mediaId', getMediaMetadata);
router.get('/v:version/:mediaId', getMediaMetadata);
router.get('/session/:sessionId/media/:mediaId', downloadMedia);
router.get('/media/:mediaId', downloadMedia);

module.exports = router;
