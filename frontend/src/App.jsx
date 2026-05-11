import React, { useState, useEffect, useCallback } from 'react';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';
import SettingsPanel from './components/SettingsPanel';
import socket from './socket';

const DEFAULT_SETTINGS = {
  webhookUrl: 'http://localhost:8069/whatsapp/webhook',
  phoneNumberId: '106540352242922',
  wabaId: '102290129340398',
  appId: '102290129340398',
  appSecret: 'my_verify_token',
  accessToken: 'my_verify_token',
  from: '16505551234',
  contactName: 'Test User',
  verifyToken: 'my_verify_token',
};

function loadSettings() {
  try {
    const saved = localStorage.getItem('wa_sim_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

let msgCounter = 0;
function nextId() {
  return `msg_${Date.now()}_${++msgCounter}`;
}

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  // Socket connection status
  useEffect(() => {
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) setSocketConnected(true);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  // Listen for agent replies
  useEffect(() => {
    const onReply = (data) => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          direction: 'received',
          type: data.type || 'text',
          text: data.text || '',
          location: data.location,
          url: data.url,
          raw: data.raw,
          timestamp: data.timestamp || Date.now(),
          status: null,
        },
      ]);
    };
    socket.on('agent:reply', onReply);
    return () => socket.off('agent:reply', onReply);
  }, []);

  const handleSend = useCallback(async (msgData) => {
    const id = nextId();

    // Optimistic add to chat
    const optimistic = {
      id,
      direction: 'sent',
      type: msgData.type,
      text: msgData.text,
      location: msgData.location,
      timestamp: Date.now(),
      status: 'sending',
    };
    setMessages((prev) => [...prev, optimistic]);
    setIsTyping(true);

    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: settings.webhookUrl,
          phoneNumberId: settings.phoneNumberId,
          wabaId: settings.wabaId,
          appSecret: settings.appSecret || settings.verifyToken,
          from: settings.from,
          contactName: settings.contactName,
          type: msgData.type,
          text: msgData.text,
          location: msgData.location,
        }),
      });

      const result = await res.json();

      // Update message status
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, status: result.success ? 'sent' : 'error' } : m
        )
      );

      if (!result.success) {
        setIsTyping(false);
        console.error('[send] webhook error:', result);
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: 'error' } : m))
      );
      setIsTyping(false);
      console.error('[send] fetch error:', err);
    }
  }, [settings]);

  const handleClearChat = () => setMessages([]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-200 font-sans">
      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Settings Sidebar */}
      <div
        className={`
          fixed md:relative z-40 h-full w-72 shadow-xl transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:block
        `}
      >
        <SettingsPanel onSave={(s) => { setSettings(s); setSidebarOpen(false); }} />
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="bg-wa-header text-white flex items-center px-4 py-3 gap-3 shadow-md">
          {/* Mobile: sidebar toggle */}
          <button
            className="md:hidden text-white text-xl"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open settings"
          >
            ⚙️
          </button>

          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-green-400 flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
            {settings.contactName?.[0]?.toUpperCase() ?? 'T'}
          </div>

          {/* Contact info */}
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-base truncate">{settings.contactName || 'Test User'}</h1>
            <p className="text-xs text-green-200 truncate">{settings.from}</p>
          </div>

          {/* Status + clear */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-xs text-green-100 hidden sm:block">
                {socketConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <button
              onClick={handleClearChat}
              title="Clear chat"
              className="text-green-200 hover:text-white text-sm transition-colors"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Chat messages */}
        <ChatWindow messages={messages} isTyping={isTyping} />

        {/* Input bar */}
        <MessageInput onSend={handleSend} disabled={false} />
      </div>
    </div>
  );
}
