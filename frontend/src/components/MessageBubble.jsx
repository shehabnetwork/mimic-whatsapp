import React from 'react';

// Parse WhatsApp-style markdown into React elements
// Supports: **bold**, _italic_, ~strikethrough~, `code`
function formatWhatsApp(text) {
  if (!text) return null;
  const patterns = [
    { re: /\*\*(.+?)\*\*/g, tag: 'strong' },
    { re: /_(.+?)_/g,        tag: 'em' },
    { re: /~(.+?)~/g,        tag: 's' },
    { re: /`(.+?)`/g,        tag: 'code' },
  ];

  // Build a flat list of segments: { type: 'text'|tag, content }
  let segments = [{ type: 'text', content: text }];

  for (const { re, tag } of patterns) {
    const next = [];
    for (const seg of segments) {
      if (seg.type !== 'text') { next.push(seg); continue; }
      let last = 0;
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(seg.content)) !== null) {
        if (m.index > last) next.push({ type: 'text', content: seg.content.slice(last, m.index) });
        next.push({ type: tag, content: m[1] });
        last = m.index + m[0].length;
      }
      if (last < seg.content.length) next.push({ type: 'text', content: seg.content.slice(last) });
    }
    segments = next;
  }

  return segments.map((seg, i) => {
    if (seg.type === 'text') return seg.content;
    const Tag = seg.type;
    return <Tag key={i}>{seg.content}</Tag>;
  });
}

function FormattedText({ text, className }) {
  return (
    <p className={className} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {formatWhatsApp(text)}
    </p>
  );
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function StatusIcon({ status }) {
  if (status === 'sending') return <span className="text-gray-400">🕐</span>;
  if (status === 'sent') return <span className="text-gray-400">✓✓</span>;
  if (status === 'error') return <span className="text-red-400">!</span>;
  return null;
}

function LocationBubble({ location }) {
  const { latitude, longitude, name, address } = location;
  const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  return (
    <div className="flex flex-col gap-1">
      <div className="rounded overflow-hidden bg-gray-100 w-48 h-24 flex items-center justify-center text-xs text-gray-400 border border-gray-200">
        <div className="text-center px-2">
          <div className="text-lg mb-1">📍</div>
          <div className="font-medium text-gray-600 truncate">{name || `${latitude}, ${longitude}`}</div>
          {address && <div className="text-gray-400 text-xs truncate">{address}</div>}
        </div>
      </div>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-500 underline"
      >
        Open in Google Maps
      </a>
      <div className="text-xs text-gray-400">
        {latitude}, {longitude}
      </div>
    </div>
  );
}

function ImageBubble({ message }) {
  return (
    <div className="flex flex-col gap-1">
      {message.url ? (
        <a href={message.url} target="_blank" rel="noopener noreferrer">
          <img
            src={message.url}
            alt={message.fileName || 'Shared image'}
            className="block max-w-full w-64 max-h-72 object-contain rounded bg-gray-100"
          />
        </a>
      ) : (
        <span className="text-xs text-gray-400">[Image]</span>
      )}
      {message.fileName && <span className="text-xs text-gray-500 truncate">{message.fileName}</span>}
    </div>
  );
}

function AudioBubble({ message }) {
  return message.url ? (
    <audio controls preload="metadata" src={message.url} className="w-64 max-w-full" />
  ) : (
    <span className="text-xs text-gray-400">[Voice message]</span>
  );
}

export default function MessageBubble({ message }) {
  const isSent = message.direction === 'sent';

  return (
    <div className={`flex mb-1 ${isSent ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          relative max-w-xs lg:max-w-md px-3 py-2 rounded-lg shadow-sm
          ${isSent
            ? 'bg-wa-light bubble-sent rounded-br-none'
            : 'bg-white bubble-received rounded-bl-none'
          }
        `}
      >
        {/* Message content */}
        {message.type === 'text' && (
          <FormattedText text={message.text} className="text-sm text-gray-800" />
        )}
        {message.type === 'location' && (
          <LocationBubble location={message.location} />
        )}
        {message.type === 'template' && (
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wide mr-1">[Template]</span>
            <FormattedText text={message.text} className="text-sm text-gray-800" />
          </div>
        )}
        {message.type === 'interactive' && (
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wide mr-1">[Interactive]</span>
            <FormattedText text={message.text} className="text-sm text-gray-800" />
          </div>
        )}
        {message.type === 'image' && (
          <ImageBubble message={message} />
        )}
        {message.type === 'audio' && (
          <AudioBubble message={message} />
        )}
        {message.type === 'document' && (
          <div>
            <span className="text-xs text-gray-400">[Document]</span>
            {message.url && (
              <a href={message.url} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-500 underline mt-1 truncate">
                {message.url}
              </a>
            )}
          </div>
        )}
        {/* Unknown fallback */}
        {!['text','location','template','interactive','image','audio','document'].includes(message.type) && (
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer">Raw payload</summary>
            <pre className="mt-1 bg-gray-100 p-1 rounded text-xs overflow-auto max-w-xs">
              {JSON.stringify(message.raw ?? message, null, 2)}
            </pre>
          </details>
        )}

        {/* Timestamp + status */}
        <div className={`flex items-center justify-end gap-1 mt-1 ${isSent ? '' : ''}`}>
          <span className="text-xs text-wa-time">{formatTime(message.timestamp)}</span>
          {isSent && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}
