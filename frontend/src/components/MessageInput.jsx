import React, { useState, useRef, useEffect } from 'react';
import LocationPicker from './LocationPicker';

export default function MessageInput({ onSend, disabled }) {
  const [text, setText] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [text]);

  const handleSendText = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend({ type: 'text', text: trimmed });
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleLocationConfirm = (location) => {
    setShowLocationPicker(false);
    onSend({ type: 'location', location });
  };

  return (
    <div className="relative">
      {/* Location picker popup */}
      {showLocationPicker && (
        <div className="absolute bottom-full left-4 mb-2 z-50">
          <LocationPicker
            onConfirm={handleLocationConfirm}
            onCancel={() => setShowLocationPicker(false)}
          />
        </div>
      )}

      <div className="flex items-end gap-2 bg-wa-input px-3 py-2 border-t border-wa-border">
        {/* Location button */}
        <button
          onClick={() => setShowLocationPicker((v) => !v)}
          disabled={disabled}
          title="Share location"
          className={`
            flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl
            transition-colors disabled:opacity-40
            ${showLocationPicker ? 'bg-wa-teal text-white' : 'text-gray-500 hover:bg-gray-200'}
          `}
        >
          📍
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Type a message"
          className="
            flex-1 bg-white rounded-2xl px-4 py-2 text-sm resize-none
            border border-wa-border focus:outline-none focus:border-wa-teal
            overflow-hidden max-h-28 leading-5 disabled:opacity-50
          "
        />

        {/* Send button */}
        <button
          onClick={handleSendText}
          disabled={disabled || !text.trim()}
          title="Send message"
          className="
            flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
            bg-wa-teal text-white hover:bg-wa-dark transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M1.101 21.757 23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
