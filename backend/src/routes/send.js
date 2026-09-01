const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { saveMedia } = require('../mediaStore');

const router = express.Router();

/**
 * POST /api/send
 *
 * Body:
 * {
 *   webhookUrl: string,        // e.g. http://localhost:8069/whatsapp/webhook
 *   phoneNumberId: string,     // e.g. "106540352242922"
 *   wabaId: string,            // e.g. "102290129340398"
 *   from: string,              // simulated user phone e.g. "16505551234"
 *   contactName: string,       // e.g. "Test User"
 *   type: "text" | "location" | "image" | "audio",
 *   text: string,              // for type=text
 *   location: {                // for type=location
 *     latitude: number,
 *     longitude: number,
 *     name: string,
 *     address: string,
 *   }
 *   media: { data: string, mimeType: string, fileName: string }
 * }
 */
router.post('/', async (req, res) => {
  const {
    webhookUrl,
    phoneNumberId,
    wabaId,
    from,
    contactName,
    type,
    text,
    location,
    media,
    appSecret,
  } = req.body;

  if (!webhookUrl || !phoneNumberId || !from || !type) {
    return res.status(400).json({ error: 'Missing required fields: webhookUrl, phoneNumberId, from, type' });
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const messageId = `wamid.${uuidv4().replace(/-/g, '')}`;

  // Build message object based on type
  let messageObj;
  if (type === 'text') {
    if (!text) return res.status(400).json({ error: 'text field required for type=text' });
    messageObj = {
      from,
      id: messageId,
      timestamp,
      type: 'text',
      text: { body: text },
    };
  } else if (type === 'location') {
    if (!location) return res.status(400).json({ error: 'location field required for type=location' });
    messageObj = {
      from,
      id: messageId,
      timestamp,
      type: 'location',
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.name || '',
        address: location.address || '',
      },
    };
  } else if (type === 'image' || type === 'audio') {
    if (!media?.data) return res.status(400).json({ error: `media.data field required for type=${type}` });
    const validMimeType = type === 'image'
      ? ['image/jpeg', 'image/png'].includes(media.mimeType)
      : typeof media.mimeType === 'string' && media.mimeType.startsWith('audio/');
    if (!validMimeType) return res.status(400).json({ error: `Unsupported ${type} MIME type` });

    const maxBytes = type === 'image' ? 5 * 1024 * 1024 : 16 * 1024 * 1024;
    let storedMedia;
    try {
      storedMedia = saveMedia(media, maxBytes);
    } catch (err) {
      const status = err.message.includes('size limit') ? 413 : 400;
      return res.status(status).json({ error: err.message });
    }

    messageObj = {
      from,
      id: messageId,
      timestamp,
      type,
      [type]: {
        id: storedMedia.id,
        mime_type: storedMedia.mimeType,
        sha256: storedMedia.sha256,
        ...(type === 'audio' ? { voice: true } : {}),
      },
    };
  } else {
    return res.status(400).json({ error: `Unsupported message type: ${type}` });
  }

  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: wabaId || 'WABA_ID',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: from,
                phone_number_id: phoneNumberId,
              },
              contacts: [
                {
                  profile: { name: contactName || 'Test User' },
                  wa_id: from,
                },
              ],
              messages: [messageObj],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };

  const payloadString = JSON.stringify(payload);

  // Sign the payload with HMAC-SHA256 using the App Secret — Odoo validates this
  const secret = appSecret || 'my_verify_token';
  const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(payloadString).digest('hex');

  console.log(`\n[send] → POST ${webhookUrl}`);
  console.log('[send] → payload:', JSON.stringify(payload, null, 2));
  console.log('[send] → X-Hub-Signature-256:', signature);

  try {
    const response = await axios.post(webhookUrl, payloadString, {
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signature,
      },
      timeout: 10000,
    });
    console.log(`[send] ← Odoo responded ${response.status}:`, JSON.stringify(response.data, null, 2));
    return res.json({
      success: true,
      odooStatus: response.status,
      odooData: response.data,
      sentPayload: payload,
    });
  } catch (err) {
    const odooStatus = err.response?.status;
    const odooData = err.response?.data;
    console.error(`[send] ← Odoo error ${odooStatus ?? 'no response'}: ${err.message}`);
    if (odooData) console.error('[send] ← Odoo error body:', JSON.stringify(odooData, null, 2));
    return res.status(502).json({
      success: false,
      error: err.message,
      odooStatus,
      odooData,
      sentPayload: payload,
    });
  }
});

module.exports = router;
