const express = require('express');
const router = express.Router();

/**
 * Mock Meta Graph API — intercepts outbound messages Odoo sends to:
 *   POST https://graph.facebook.com/v{version}/{phoneNumberId}/messages
 *
 * Matched here as:
 *   POST /v:version/:phoneNumberId/messages
 *
 * We capture the message body, emit it via Socket.io to the frontend,
 * and respond with a fake successful Meta API response.
 */
router.post('/v:version/:phoneNumberId/messages', (req, res) => {
  const { phoneNumberId, version } = req.params;
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
  } else if (body.type === 'document') {
    outbound.type = 'document';
    outbound.to = body.to;
    outbound.text = `[Document: ${body.document?.filename || 'file'}]`;
    outbound.url = body.document?.link;
  }

  // Broadcast to all connected frontend clients
  io.emit('agent:reply', outbound);

  // Return a valid Meta API success response
  const fakeWamid = `wamid.${Buffer.from(Date.now().toString()).toString('base64')}`;
  return res.status(200).json({
    messaging_product: 'whatsapp',
    contacts: [{ input: body.to, wa_id: body.to }],
    messages: [{ id: fakeWamid }],
  });
});

module.exports = router;
