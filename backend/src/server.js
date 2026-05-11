const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const sendRoute = require('./routes/send');
const metaApiRoute = require('./routes/metaApi');
const verifyRoute = require('./routes/verify');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Make io available to routes
app.set('io', io);

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/send', sendRoute);
app.use('/api/verify-webhook', verifyRoute);

// Mock Meta Graph API — Odoo posts replies here
// Odoo calls: POST https://graph.facebook.com/v{ver}/{phoneNumberId}/messages
// We intercept: POST /v:version/:phoneNumberId/messages
app.use('/', metaApiRoute);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

io.on('connection', (socket) => {
  console.log('[socket] client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('[socket] client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[backend] running on http://localhost:${PORT}`);
  console.log(`[backend] mock Meta Graph API ready — point Odoo's WhatsApp API URL to http://localhost:${PORT}`);
});
