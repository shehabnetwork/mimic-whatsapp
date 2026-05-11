import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

export default function ChatWindow({ messages, isTyping }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto wa-chat-bg px-4 py-3">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50 select-none">
          <div className="text-5xl">💬</div>
          <p className="text-sm text-gray-500">Send a message to start the conversation</p>
        </div>
      )}

      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {isTyping && (
        <div className="flex items-end gap-1 mb-2">
          <div className="bg-white rounded-lg rounded-bl-none px-4 py-3 shadow-sm flex gap-1 items-center">
            <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 inline-block"></span>
            <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 inline-block"></span>
            <span className="typing-dot w-2 h-2 rounded-full bg-gray-400 inline-block"></span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
