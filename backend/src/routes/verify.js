const express = require('express');
const axios = require('axios');

const router = express.Router();

/**
 * POST /api/verify-webhook
 *
 * Sends a GET to the target webhook URL simulating Meta's hub challenge verification.
 *
 * Body:
 * {
 *   webhookUrl: string,    // e.g. http://localhost:8069/whatsapp/webhook
 *   verifyToken: string,   // must match what Odoo has configured
 * }
 */
router.post('/', async (req, res) => {
  const { webhookUrl, verifyToken } = req.body;

  if (!webhookUrl || !verifyToken) {
    return res.status(400).json({ error: 'webhookUrl and verifyToken are required' });
  }

  const challenge = Math.random().toString(36).substring(2, 12);

  const url = new URL(webhookUrl);
  url.searchParams.set('hub.mode', 'subscribe');
  url.searchParams.set('hub.verify_token', verifyToken);
  url.searchParams.set('hub.challenge', challenge);

  try {
    const response = await axios.get(url.toString(), { timeout: 8000 });
    const echoed = response.data?.toString?.() ?? String(response.data);
    return res.json({
      success: echoed === challenge,
      sentChallenge: challenge,
      receivedResponse: echoed,
      statusCode: response.status,
    });
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: err.message,
      statusCode: err.response?.status,
    });
  }
});

module.exports = router;
